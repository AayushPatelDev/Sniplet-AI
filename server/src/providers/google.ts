import { GoogleGenAI } from "@google/genai";
import type { CompletionParams, Provider, ProviderChunk } from "./types.js";

/**
 * Gemini calls the system prompt `systemInstruction` and reports usage only on
 * the final chunk, so we track the last-seen metadata and emit it at the end.
 */
async function* stream(params: CompletionParams): AsyncGenerator<ProviderChunk> {
  const client = new GoogleGenAI({ apiKey: params.apiKey });

  const response = await client.models.generateContentStream({
    model: params.model,
    contents: params.user,
    config: {
      systemInstruction: params.system,
      temperature: params.temperature,
      maxOutputTokens: 16_000,
      abortSignal: params.signal,
    },
  });

  let lastUsage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield { type: "text", text };
    if (chunk.usageMetadata) lastUsage = chunk.usageMetadata;
  }

  if (lastUsage) {
    yield {
      type: "usage",
      usage: {
        inputTokens: lastUsage.promptTokenCount,
        outputTokens: lastUsage.candidatesTokenCount,
      },
    };
  }
}

export const googleProvider: Provider = {
  id: "google",
  label: "Google (Gemini)",
  defaultModel: "gemini-2.5-pro",
  needsBaseUrl: false,
  keyUrl: "https://aistudio.google.com/apikey",
  hint: "Keys start with `AIza`. AI Studio has a free tier with daily limits — good for trying this out.",
  models: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality, huge context window." },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast, generous free tier." },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", note: "Cheapest option." },
  ],
  stream,
};
