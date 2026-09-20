/**
 * Mirror of `server/src/types.ts`.
 *
 * Duplicated rather than shared through a package because two small files that
 * are obviously parallel beat a third workspace, a build step, and a path alias
 * for a project this size. If a third consumer ever appears, extract it then.
 */

export const PROVIDER_IDS = ["openai", "anthropic", "google", "compatible"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const GENERATION_MODES = ["snippet", "component", "app"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export type ErrorCode =
  | "missing_key"
  | "invalid_key"
  | "rate_limited"
  | "quota_exceeded"
  | "bad_request"
  | "model_not_found"
  | "upstream_error"
  | "network_error"
  | "aborted"
  | "internal";

export type StreamEvent =
  | { type: "start"; provider: ProviderId; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; usage?: TokenUsage }
  | { type: "error"; message: string; code: ErrorCode };

export interface ModelInfo {
  id: string;
  label: string;
  note?: string;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  hasServerKey: boolean;
  needsBaseUrl: boolean;
  defaultModel: string;
  models: ModelInfo[];
  keyUrl: string;
  hint: string;
}

export interface ConfigResponse {
  providers: ProviderInfo[];
  defaultProvider: ProviderId;
  defaultModel: string | null;
  allowClientKeys: boolean;
}

export interface GenerateRequest {
  prompt: string;
  mode: GenerationMode;
  provider: ProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}

export const MODE_LABELS: Record<GenerationMode, { title: string; blurb: string }> = {
  snippet: { title: "Snippet", blurb: "A function, script, or utility. One file." },
  component: { title: "Component", blurb: "A single UI piece, typed and accessible." },
  app: { title: "App", blurb: "A small runnable project, multiple files." },
};
