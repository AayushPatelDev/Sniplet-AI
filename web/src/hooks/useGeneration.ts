import { useCallback, useEffect, useRef, useState } from "react";
import { generate } from "../lib/api";
import { parse, type ParsedResult } from "../lib/parser";
import type { ErrorCode, GenerateRequest, TokenUsage } from "../lib/types";

export type Status = "idle" | "streaming" | "done" | "error";

export interface GenerationState {
  status: Status;
  result: ParsedResult;
  raw: string;
  error: { message: string; code: ErrorCode } | null;
  usage: TokenUsage | null;
  model: string | null;
  elapsedMs: number;
}

const EMPTY_RESULT: ParsedResult = { plan: "", files: [], notes: "", stray: "" };

const INITIAL: GenerationState = {
  status: "idle",
  result: EMPTY_RESULT,
  raw: "",
  error: null,
  usage: null,
  model: null,
  elapsedMs: 0,
};

/**
 * Owns one generation: the request, the stream, the parse, and cancellation.
 *
 * Tokens arrive far faster than anyone can read, so the raw buffer is kept in a
 * ref and re-parsed once per animation frame. Re-rendering on every token would
 * spend the whole frame budget on React and make the stream look choppier than
 * it actually is.
 */
export function useGeneration() {
  const [state, setState] = useState<GenerationState>(INITIAL);

  const bufferRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);

  const flush = useCallback(() => {
    frameRef.current = null;
    setState((prev) => ({ ...prev, raw: bufferRef.current, result: parse(bufferRef.current) }));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(flush);
  }, [flush]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    bufferRef.current = "";
    setState(INITIAL);
  }, [cancel]);

  const run = useCallback(
    async (request: GenerateRequest) => {
      cancel();

      const controller = new AbortController();
      abortRef.current = controller;
      bufferRef.current = "";
      startedAtRef.current = performance.now();

      setState({ ...INITIAL, status: "streaming" });

      try {
        for await (const event of generate(request, controller.signal)) {
          switch (event.type) {
            case "start":
              setState((prev) => ({ ...prev, model: event.model }));
              break;

            case "delta":
              bufferRef.current += event.text;
              scheduleFlush();
              break;

            case "done":
              finish("done", { usage: event.usage ?? null });
              return;

            case "error":
              finish("error", { error: { message: event.message, code: event.code } });
              return;
          }
        }

        // The stream ended without a terminal event — treat whatever we have as
        // complete rather than leaving the UI spinning forever.
        finish("done", {});
      } catch (err) {
        if (controller.signal.aborted) {
          finish("done", {});
          return;
        }
        finish("error", {
          error: {
            message:
              err instanceof Error
                ? err.message
                : "Couldn't reach the Sniplet server. Is it running on port 3001?",
            code: "network_error",
          },
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }

      function finish(status: Status, patch: Partial<GenerationState>) {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          ...patch,
          status,
          raw: bufferRef.current,
          result: parse(bufferRef.current),
          elapsedMs: performance.now() - startedAtRef.current,
        }));
      }
    },
    [cancel, scheduleFlush],
  );

  // Abort any in-flight request if the component goes away mid-stream.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { ...state, run, cancel, reset };
}
