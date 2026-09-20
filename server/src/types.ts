/**
 * Wire types shared between the server and the web client.
 *
 * The browser never talks to a model vendor directly — it talks to this server,
 * which normalises every provider down to the one event stream described here.
 * That is the whole point of the rewrite: swapping OpenAI for Claude changes a
 * dropdown, not the client.
 */

export const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "compatible",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/** The shape of work we're asking the model for. Drives prompt selection. */
export const GENERATION_MODES = ["snippet", "component", "app"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

/** A request from the browser to generate something. */
export interface GenerateRequest {
  prompt: string;
  mode: GenerationMode;
  provider: ProviderId;
  model?: string;
  /** Only honoured when ALLOW_CLIENT_KEYS is enabled. Never logged, never stored. */
  apiKey?: string;
  /** Only meaningful for the `compatible` provider. */
  baseUrl?: string;
  temperature?: number;
}

/**
 * Normalised server-sent events. Every provider is funnelled into these four,
 * so the client has exactly one stream format to understand.
 */
export type StreamEvent =
  | { type: "start"; provider: ProviderId; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; usage?: TokenUsage }
  | { type: "error"; message: string; code: ErrorCode };

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

/** Metadata the UI uses to populate the provider/model pickers. */
export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** True when the server already holds a usable key from `.env`. */
  hasServerKey: boolean;
  /** True when this provider needs a base URL as well as a key. */
  needsBaseUrl: boolean;
  defaultModel: string;
  models: ModelInfo[];
  keyUrl: string;
  /** Where users get a key / what to type, shown in the settings panel. */
  hint: string;
}

export interface ModelInfo {
  id: string;
  label: string;
  /** One-line "pick this when…" shown under the model in the dropdown. */
  note?: string;
}

export interface ConfigResponse {
  providers: ProviderInfo[];
  defaultProvider: ProviderId;
  defaultModel: string | null;
  allowClientKeys: boolean;
}
