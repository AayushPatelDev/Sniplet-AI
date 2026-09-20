import type { ModelInfo, ProviderId, TokenUsage } from "../types.js";

export interface CompletionParams {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
  baseUrl?: string;
  signal: AbortSignal;
}

/** What a provider yields while streaming: text chunks, then a final usage tally. */
export type ProviderChunk =
  | { type: "text"; text: string }
  | { type: "usage"; usage: TokenUsage };

/**
 * The entire surface a provider has to implement.
 *
 * Adding a vendor means writing one of these and registering it — no route,
 * client, or prompt code changes. That's the contract the old single-vendor
 * backend was missing.
 */
export interface Provider {
  readonly id: ProviderId;
  readonly label: string;
  readonly defaultModel: string;
  readonly models: ModelInfo[];
  readonly needsBaseUrl: boolean;
  readonly keyUrl: string;
  readonly hint: string;
  stream(params: CompletionParams): AsyncGenerator<ProviderChunk>;
}
