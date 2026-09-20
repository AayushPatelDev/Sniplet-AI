import type { ProviderId } from "../types.js";
import { anthropicProvider } from "./anthropic.js";
import { googleProvider } from "./google.js";
import { compatibleProvider, openaiProvider } from "./openai.js";
import type { Provider } from "./types.js";

export const providers: Record<ProviderId, Provider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  compatible: compatibleProvider,
};

export function getProvider(id: ProviderId): Provider {
  return providers[id];
}

export const providerList: Provider[] = Object.values(providers);
