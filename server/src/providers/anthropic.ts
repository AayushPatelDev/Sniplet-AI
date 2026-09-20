import Anthropic from "@anthropic-ai/sdk";
import type { CompletionParams, Provider, ProviderChunk } from "./types.js";

/**
 * Anthropic's Messages API differs from OpenAI's in two ways that matter here:
 * the system prompt is a top-level field rather than a message, and usage
 * arrives split across the `message_start` and `message_delta` events.
 */
async function* stream(params: CompletionParams): AsyncGenerator<ProviderChunk> {
  const client = new Anthropic({ apiKey: params.apiKey, maxRetries: 2 });

  const response = await client.messages.stream(
    {
      model: params.model,
      max_tokens: 16_000,
      temperature: params.temperature,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    },
    { signal: params.signal },
  );

  let inputTokens: number | undefined;

  for await (const event of response) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { type: "text", text: event.delta.text };
    } else if (event.type === "message_start") {
      inputTokens = event.message.usage?.input_tokens;
    } else if (event.type === "message_delta" && event.usage) {
      yield {
        type: "usage",
        usage: { inputTokens, outputTokens: event.usage.output_tokens },
      };
    }
  }
}

export const anthropicProvider: Provider = {
  id: "anthropic",
  label: "Anthropic (Claude)",
  defaultModel: "claude-sonnet-5",
  needsBaseUrl: false,
  keyUrl: "https://console.anthropic.com/settings/keys",
  hint: "Keys start with `sk-ant-`. Buy credits in the Console before your first call.",
  models: [
    { id: "claude-opus-5", label: "Claude Opus 5", note: "Strongest at long, multi-file work." },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "Best balance — the default here." },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "Fastest and cheapest." },
  ],
  stream,
};
