import type { ErrorCode } from "../types.js";

/**
 * An error we're willing to show the user verbatim.
 *
 * Anything that isn't an AppError gets flattened to a generic message before it
 * reaches the client, so provider SDK internals (which sometimes echo request
 * headers back in their messages) can't leak an API key into the browser.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/** Matches `sk-...`, `sk-ant-...`, `AIza...` and friends. */
const KEY_PATTERN = /\b(sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]{12,})/g;

export function redact(text: string): string {
  return text.replace(KEY_PATTERN, "[redacted]");
}

/**
 * Turn anything thrown by a provider SDK into an AppError with a message a
 * human can act on. Each SDK reports auth failures differently; the status code
 * is the one thing they agree on, so we lead with that.
 */
export function normaliseProviderError(err: unknown, provider: string): AppError {
  if (err instanceof AppError) return err;

  const anyErr = err as { status?: number; message?: string; name?: string; error?: { message?: string } };
  const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
  const raw = anyErr?.error?.message ?? anyErr?.message ?? String(err);
  const detail = redact(raw).slice(0, 400);

  if (anyErr?.name === "AbortError") {
    return new AppError("aborted", "Generation cancelled.", 499);
  }

  switch (status) {
    case 401:
    case 403:
      return new AppError(
        "invalid_key",
        `${provider} rejected the API key. Check that it's correct, active, and has credit.`,
        401,
      );
    case 404:
      return new AppError(
        "model_not_found",
        `${provider} doesn't recognise that model. Pick a different one in Settings.`,
        404,
      );
    case 429:
      return new AppError(
        "rate_limited",
        `${provider} is rate limiting you. Wait a moment, or check your plan's limits.`,
        429,
      );
    case 400:
    case 422:
      return new AppError("bad_request", `${provider} rejected the request: ${detail}`, 400);
    default:
      break;
  }

  if (status && status >= 500) {
    return new AppError("upstream_error", `${provider} is having trouble right now (${status}). Try again.`, 502);
  }

  // The SDKs report an unreachable host in several different ways: OpenAI
  // raises APIConnectionError("Connection error."), while undici surfaces the
  // raw syscall error. Match all of them, including the nested `cause`.
  const cause = String((err as { cause?: unknown })?.cause ?? "");
  const connectionish = `${anyErr?.name ?? ""} ${raw} ${cause}`;

  if (/APIConnectionError|Connection error|fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|network/i.test(connectionish)) {
    return new AppError(
      "network_error",
      `Couldn't reach ${provider}. Check the base URL and your connection — ` +
        `and if you're using a local model, that it's actually running.`,
      502,
    );
  }

  return new AppError("upstream_error", detail || `${provider} request failed.`, 502);
}
