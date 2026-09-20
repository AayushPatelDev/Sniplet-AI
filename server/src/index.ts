import express from "express";
import cors from "cors";
import { config, hasAnyServerKey } from "./config.js";
import { redact } from "./lib/errors.js";
import { configRouter } from "./routes/config.js";
import { generateRouter } from "./routes/generate.js";

const app = express();

// This server is meant to run on your own machine. It defaults to accepting
// only the local Vite dev server rather than `*`, so a page you happen to have
// open in another tab can't quietly spend your API credit.
app.use(
  cors({
    origin: config.CORS_ORIGIN ?? [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
    ],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "2.0.0" }));
app.use("/api", configRouter);
app.use("/api", generateRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found", code: "bad_request" }));

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[server]", redact(String(err)));
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error", code: "internal" });
  },
);

const server = app.listen(config.PORT, () => {
  const keyState = hasAnyServerKey()
    ? "using API keys from .env"
    : config.ALLOW_CLIENT_KEYS
      ? "no keys in .env — add one in the app's Settings panel"
      : "no keys in .env and client keys are disabled — nothing will work yet";

  console.log(`\n  Sniplet AI server  ·  http://localhost:${config.PORT}`);
  console.log(`  ${keyState}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
