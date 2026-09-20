import { Router } from "express";
import { z } from "zod";
import { config, serverKeyFor } from "../config.js";
import { AppError, normaliseProviderError, redact } from "../lib/errors.js";
import { SseStream } from "../lib/sse.js";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/system.js";
import { getProvider } from "../providers/registry.js";
import { GENERATION_MODES, PROVIDER_IDS } from "../types.js";

const BodySchema = z.object({
  prompt: z.string().trim().min(1, "Describe what you want built.").max(8000),
  mode: z.enum(GENERATION_MODES).default("snippet"),
  provider: z.enum(PROVIDER_IDS),
  model: z.string().trim().min(1).max(200).optional(),
  apiKey: z.string().trim().min(1).max(500).optional(),
  baseUrl: z.string().trim().url("Base URL must be a full URL, e.g. http://localhost:11434/v1").optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const generateRouter = Router();

generateRouter.post("/generate", async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    res.status(400).json({ error: message, code: "bad_request" });
    return;
  }

  const body = parsed.data;
  const provider = getProvider(body.provider);

  // A key from the browser wins over .env, but only if the operator allowed it.
  let apiKey = serverKeyFor(body.provider);
  if (body.apiKey) {
    if (!config.ALLOW_CLIENT_KEYS) {
      res.status(403).json({
        error: "This server is configured to use its own keys. Remove the key from Settings.",
        code: "bad_request",
      });
      return;
    }
    apiKey = body.apiKey;
  }

  if (!apiKey) {
    res.status(400).json({
      error:
        `No API key for ${provider.label}. Either add one in Settings, ` +
        `or set the matching variable in your .env file and restart the server.`,
      code: "missing_key",
    });
    return;
  }

  const baseUrl =
    body.provider === "compatible" ? (body.baseUrl ?? config.COMPATIBLE_BASE_URL) : undefined;

  if (body.provider === "compatible" && !baseUrl) {
    res.status(400).json({
      error: "This provider needs a base URL. Add one in Settings or set COMPATIBLE_BASE_URL.",
      code: "missing_key",
    });
    return;
  }

  const model =
    body.model ??
    (body.provider === "compatible" ? config.COMPATIBLE_MODEL : config.DEFAULT_MODEL) ??
    provider.defaultModel;

  // Once headers are written we can no longer send a JSON error, so every
  // failure past this point has to travel as an `error` event on the stream.
  const stream = new SseStream(res);
  const controller = new AbortController();

  // If the user hits Stop, the browser closes the connection — abort the
  // upstream call rather than paying for tokens nobody will see.
  //
  // This must listen on `res`, not `req`: `req` emits "close" as soon as the
  // request body has been fully read, which express.json() already did above.
  // Listening there aborts every generation the instant it starts.
  res.on("close", () => {
    if (!res.writableEnded) {
      stream.markClosed();
      controller.abort();
    }
  });

  stream.send({ type: "start", provider: body.provider, model });

  try {
    const chunks = provider.stream({
      apiKey,
      model,
      system: buildSystemPrompt(body.mode),
      user: buildUserPrompt(body.prompt, body.mode),
      temperature: body.temperature ?? 0.3,
      ...(baseUrl ? { baseUrl } : {}),
      signal: controller.signal,
    });

    let usage;
    for await (const chunk of chunks) {
      if (stream.isClosed) break;
      if (chunk.type === "text") {
        stream.send({ type: "delta", text: chunk.text });
      } else {
        usage = chunk.usage;
      }
    }

    stream.end({ type: "done", ...(usage ? { usage } : {}) });
  } catch (err) {
    if (controller.signal.aborted) {
      stream.end();
      return;
    }

    const appError =
      err instanceof AppError ? err : normaliseProviderError(err, provider.label);

    // Log the real cause for the operator, redacted so a key can't reach a
    // terminal log or a screenshot.
    console.error(`[generate] ${body.provider}/${model}:`, redact(String(err)));

    stream.end({ type: "error", message: appError.message, code: appError.code });
  }
});
