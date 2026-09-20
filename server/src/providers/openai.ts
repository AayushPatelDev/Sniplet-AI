import OpenAI from "openai";
import type { CompletionParams, Provider, ProviderChunk } from "./types.js";

/**
 * OpenAI, and — via `createOpenAiCompatible` — anything that speaks the same
 * Chat Completions wire format. That covers OpenRouter, DeepSeek, Groq,
 * Together, Fireworks, Ollama and LM Studio, which is why the original
 * DeepSeek-only integration is now just one configuration of this file.
 */

function buildStream(label: string) {
  return async function* stream(params: CompletionParams): AsyncGenerator<ProviderChunk> {
    const client = new OpenAI({
      apiKey: params.apiKey,
      ...(params.baseUrl ? { baseURL: params.baseUrl } : {}),
      maxRetries: 2,
    });

    const response = await client.chat.completions.create(
      {
        model: params.model,
        temperature: params.temperature,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      },
      { signal: params.signal },
    );

    for await (const chunk of response) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield { type: "text", text };

      if (chunk.usage) {
        yield {
          type: "usage",
          usage: {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
          },
        };
      }
    }

    void label;
  };
}

export const openaiProvider: Provider = {
  id: "openai",
  label: "OpenAI",
  defaultModel: "gpt-5",
  needsBaseUrl: false,
  keyUrl: "https://platform.openai.com/api-keys",
  hint: "Keys start with `sk-`. Requires a funded account — the free tier does not cover the API.",
  models: [
    { id: "gpt-5", label: "GPT-5", note: "Best quality. Slower and pricier." },
    { id: "gpt-5-mini", label: "GPT-5 mini", note: "Strong default — fast and cheap." },
    { id: "gpt-4.1", label: "GPT-4.1", note: "Previous generation, very large context." },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini", note: "Budget option." },
    { id: "o4-mini", label: "o4-mini", note: "Reasoning model. Good for tricky algorithms." },
  ],
  stream: buildStream("OpenAI"),
};

/**
 * `compatible` is deliberately open-ended: the user supplies base URL, key and
 * model name, so a new OpenAI-shaped endpoint needs no code change at all.
 */
export const compatibleProvider: Provider = {
  id: "compatible",
  label: "OpenAI-compatible",
  defaultModel: "deepseek/deepseek-chat",
  needsBaseUrl: true,
  keyUrl: "https://openrouter.ai/keys",
  hint:
    "Any endpoint speaking the OpenAI Chat Completions API. " +
    "OpenRouter: `https://openrouter.ai/api/v1` · DeepSeek: `https://api.deepseek.com/v1` · " +
    "Ollama: `http://localhost:11434/v1` with key `ollama`.",
  models: [
    { id: "deepseek/deepseek-chat", label: "DeepSeek Chat (OpenRouter)", note: "Cheap and capable at code." },
    { id: "deepseek-chat", label: "DeepSeek Chat (direct API)", note: "Use with api.deepseek.com." },
    { id: "moonshotai/kimi-k2", label: "Kimi K2 (OpenRouter)", note: "Strong open-weights coder." },
    { id: "qwen/qwen3-coder", label: "Qwen3 Coder (OpenRouter)", note: "Built for code generation." },
    { id: "llama3.1", label: "Llama 3.1 (Ollama)", note: "Runs locally. Free, needs a good GPU." },
    { id: "qwen2.5-coder", label: "Qwen2.5 Coder (Ollama)", note: "Local, code-tuned." },
  ],
  stream: buildStream("The endpoint"),
};
