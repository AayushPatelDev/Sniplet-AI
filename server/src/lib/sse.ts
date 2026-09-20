import type { Response } from "express";
import type { StreamEvent } from "../types.js";

/**
 * A minimal server-sent-events writer.
 *
 * The old version piped the provider's raw SSE bytes straight through, which
 * meant the browser had to parse OpenRouter's wire format. Now the server owns
 * the format and emits `StreamEvent` objects, one per `data:` line.
 */
export class SseStream {
  private closed = false;

  constructor(private readonly res: Response) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stops nginx and friends from buffering the stream into one lump.
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();
  }

  send(event: StreamEvent): void {
    if (this.closed) return;
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  /** Send a terminal event and close. Safe to call more than once. */
  end(event?: StreamEvent): void {
    if (this.closed) return;
    if (event) this.send(event);
    this.closed = true;
    this.res.end();
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Mark closed without writing — used when the client hangs up first. */
  markClosed(): void {
    this.closed = true;
  }
}
