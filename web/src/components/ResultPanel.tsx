import clsx from "clsx";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileDown,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GenerationState } from "../hooks/useGeneration";
import { copyText, downloadFile, downloadZip, slugify } from "../lib/download";
import { CodeBlock } from "./CodeBlock";
import { FileTabs } from "./FileTabs";

interface ResultPanelProps {
  generation: GenerationState;
  prompt: string;
  onOpenSettings: () => void;
}

export function ResultPanel({ generation, prompt, onOpenSettings }: ResultPanelProps) {
  const { status, result, error, usage, model, elapsedMs } = generation;
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const files = result.files;

  // Follow the file being written, unless the user has picked one themselves.
  const streamingPath = files.find((f) => !f.complete)?.path;
  useEffect(() => {
    if (status === "streaming" && streamingPath) setSelectedPath(streamingPath);
  }, [status, streamingPath]);

  useEffect(() => {
    if (status === "streaming") setSelectedPath(null);
  }, [status]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === selectedPath) ?? files[0] ?? null,
    [files, selectedPath],
  );

  const handleCopy = async () => {
    if (!activeFile) return;
    if (await copyText(activeFile.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (status === "idle") return <EmptyState onOpenSettings={onOpenSettings} />;

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error.message} onOpenSettings={onOpenSettings} />}

      {result.plan && (
        <section className="card p-4" aria-label="Plan">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-faint">
            <Lightbulb aria-hidden="true" className="size-3.5" />
            Plan
          </h2>
          <div className="space-y-1 text-sm leading-relaxed text-muted">
            {result.plan.split("\n").map((line, i) => {
              const text = line.replace(/^[-*•]\s*/, "").trim();
              if (!text) return null;
              return (
                <p key={i} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55em] size-1 shrink-0 rounded-full bg-accent" />
                  <span>{text}</span>
                </p>
              );
            })}
          </div>
        </section>
      )}

      {activeFile && (
        <section className="card overflow-hidden" aria-label="Generated code">
          <FileTabs
            files={files}
            activePath={activeFile.path}
            onSelect={setSelectedPath}
          />

          <header className="flex items-center justify-between gap-3 border-b border-line bg-raised px-3 py-2">
            <code className="truncate font-mono text-xs text-muted">{activeFile.path}</code>

            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={handleCopy} className="btn btn-ghost px-2 py-1.5 text-xs">
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="size-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="size-3.5" />
                    Copy
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => downloadFile(activeFile)}
                className="btn btn-ghost px-2 py-1.5 text-xs"
                title="Download this file"
              >
                <FileDown aria-hidden="true" className="size-3.5" />
                <span className="sr-only sm:not-sr-only">File</span>
              </button>

              {files.length > 1 && (
                <button
                  type="button"
                  onClick={() => downloadZip(files, slugify(prompt))}
                  className="btn btn-ghost px-2 py-1.5 text-xs"
                  title="Download all files as a zip"
                >
                  <Download aria-hidden="true" className="size-3.5" />
                  <span className="sr-only sm:not-sr-only">Zip</span>
                </button>
              )}
            </div>
          </header>

          <div className="max-h-[min(60vh,42rem)] overflow-auto bg-code">
            <CodeBlock
              code={activeFile.content}
              language={activeFile.language}
              streaming={!activeFile.complete && status === "streaming"}
            />
          </div>
        </section>
      )}

      {/* Nothing parsed yet — show the raw stream so it never looks frozen. */}
      {!activeFile && status === "streaming" && (
        <section className="card p-4" aria-live="polite">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sparkles aria-hidden="true" className="size-4 animate-pulse text-accent" />
            Thinking…
          </p>
          {result.stray && (
            <pre className="mt-3 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-faint">
              {result.stray.slice(-600)}
            </pre>
          )}
        </section>
      )}

      {result.notes && (
        <section className="card p-4" aria-label="Notes">
          <h2 className="mb-2 text-xs font-semibold tracking-wide uppercase text-faint">Notes</h2>
          <div className="space-y-2 text-sm leading-relaxed text-muted">
            {result.notes.split(/\n{2,}/).map((block, i) => (
              // Collapse the model's hard wraps so the text reflows to the
              // container, but keep list items on their own lines.
              <p key={i} className="whitespace-pre-wrap">
                {block.trim().replace(/(?<![\n])\n(?![-*\d\s])/g, " ")}
              </p>
            ))}
          </div>
        </section>
      )}

      {status === "done" && activeFile && (
        <p className="px-1 text-xs text-faint">
          {files.length} file{files.length === 1 ? "" : "s"}
          {model && <> · {model}</>}
          {elapsedMs > 0 && <> · {(elapsedMs / 1000).toFixed(1)}s</>}
          {usage?.outputTokens && <> · {usage.outputTokens.toLocaleString()} output tokens</>}
        </p>
      )}
    </div>
  );
}

function ErrorNotice({
  message,
  onOpenSettings,
}: {
  message: string;
  onOpenSettings: () => void;
}) {
  const isKeyProblem = /key|credit|quota|billing/i.test(message);

  return (
    <div
      role="alert"
      className={clsx("flex gap-3 rounded-[var(--radius-card)] border p-4")}
      style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-ink">{message}</p>
        {isKeyProblem && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-2 text-sm font-medium text-accent hover:underline"
          >
            Open settings
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 rounded-xl border border-line bg-surface p-3">
        <Sparkles aria-hidden="true" className="size-5 text-accent" />
      </div>
      <h2 className="text-base font-semibold">Describe what you want built</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Sniplet asks your model for a structured answer — a plan, complete files, and setup
        notes — then streams them in as they're written.
      </p>
      <button type="button" onClick={onOpenSettings} className="btn btn-outline mt-5">
        Choose a provider
      </button>
    </div>
  );
}
