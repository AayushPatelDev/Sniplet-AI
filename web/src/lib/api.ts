import type { ConfigResponse, GenerateRequest, StreamEvent } from "./types";

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`Couldn't reach the Sniplet server (${res.status}).`);
  return res.json() as Promise<ConfigResponse>;
}

/**
 * POST /api/generate and yield decoded stream events.
 *
 * The server normalises every provider into the same event shape, so this
 * function is the client's only knowledge of any model vendor.
 */
export async function* generate(
  body: GenerateRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  // Validation failures come back as plain JSON before the stream starts.
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    yield {
      type: "error",
      message: problem?.error ?? `Request failed (${res.status}).`,
      code: problem?.code ?? "upstream_error",
    };
    return;
  }

  if (!res.body) {
    yield { type: "error", message: "The server returned an empty response.", code: "internal" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Anything after the last
      // separator is an incomplete frame — leave it in the buffer.
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;

        try {
          yield JSON.parse(line.slice(5).trim()) as StreamEvent;
        } catch {
          // A frame we can't parse isn't worth killing the stream over.
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
