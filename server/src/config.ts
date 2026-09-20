import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { PROVIDER_IDS, type ProviderId } from "./types.js";

/**
 * Load `.env` from the repo root, so a single file at the top level configures
 * the whole monorepo whether you run from the root or from `server/`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
for (const candidate of [path.join(repoRoot, ".env"), path.join(repoRoot, "server", ".env")]) {
  if (existsSync(candidate)) dotenv.config({ path: candidate, quiet: true });
}

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : /^(1|true|yes|on)$/i.test(v)));

/** Empty strings in a .env file should read as "not set", not as a value. */
const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed ? trimmed : undefined;
  });

const EnvSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : 3001))
    .refine((n) => Number.isInteger(n) && n > 0 && n < 65536, "PORT must be a valid port number"),
  DEFAULT_PROVIDER: z
    .enum(PROVIDER_IDS)
    .optional()
    .transform((v) => v ?? ("openai" as ProviderId)),
  DEFAULT_MODEL: optionalString,
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  GOOGLE_API_KEY: optionalString,
  COMPATIBLE_API_KEY: optionalString,
  COMPATIBLE_BASE_URL: optionalString,
  COMPATIBLE_MODEL: optionalString,
  ALLOW_CLIENT_KEYS: bool(true),
  CORS_ORIGIN: optionalString,
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nInvalid configuration in .env:\n${issues}\n`);
  process.exit(1);
}

export const config = parsed.data;

/** The server-side key for a provider, if `.env` supplied one. */
export function serverKeyFor(provider: ProviderId): string | undefined {
  switch (provider) {
    case "openai":
      return config.OPENAI_API_KEY;
    case "anthropic":
      return config.ANTHROPIC_API_KEY;
    case "google":
      return config.GOOGLE_API_KEY;
    case "compatible":
      return config.COMPATIBLE_API_KEY;
  }
}

/** True if at least one provider is usable without the browser supplying a key. */
export function hasAnyServerKey(): boolean {
  return PROVIDER_IDS.some((id) => Boolean(serverKeyFor(id)));
}
