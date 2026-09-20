import clsx from "clsx";
import { ArrowUp, Settings2, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import { GENERATION_MODES, MODE_LABELS, type GenerationMode } from "../lib/types";

interface ComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onOpenSettings: () => void;
  streaming: boolean;
  disabled: boolean;
  providerLabel: string;
  model: string;
  needsKey: boolean;
}

export function Composer({
  prompt,
  onPromptChange,
  mode,
  onModeChange,
  onSubmit,
  onCancel,
  onOpenSettings,
  streaming,
  disabled,
  providerLabel,
  model,
  needsKey,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a ceiling, so short prompts don't sit in a
  // needlessly tall box and long ones don't push the results off screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [prompt]);

  // Cmd/Ctrl+K focuses the prompt from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const canSubmit = prompt.trim().length > 0 && !disabled && !streaming;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="card overflow-hidden shadow-[var(--shadow)]"
    >
      {/* ── Mode selector ──────────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="What kind of output"
        className="flex gap-1 border-b border-line p-1.5"
      >
        {GENERATION_MODES.map((value) => {
          const isActive = value === mode;
          const { title, blurb } = MODE_LABELS[value];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onModeChange(value)}
              title={blurb}
              className={clsx(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                isActive ? "bg-raised text-ink" : "text-muted hover:text-ink",
              )}
            >
              {title}
            </button>
          );
        })}
      </div>

      <label htmlFor="prompt" className="sr-only">
        Describe what you want built
      </label>
      <textarea
        id="prompt"
        ref={textareaRef}
        rows={3}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter makes a new line. Standard for a composer.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }
        }}
        placeholder={PLACEHOLDERS[mode]}
        spellCheck={false}
        className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint"
      />

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="btn btn-ghost min-w-0 px-2 py-1.5"
        >
          <Settings2 aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate text-xs">
            {providerLabel}
            <span className="mx-1.5 text-faint">·</span>
            <span className="font-mono">{model || "default"}</span>
          </span>
          {needsKey && (
            <span className="ml-1 shrink-0 rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">
              key needed
            </span>
          )}
        </button>

        {streaming ? (
          <button type="button" onClick={onCancel} className="btn btn-outline">
            <Square aria-hidden="true" className="size-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!canSubmit} className="btn btn-primary">
            Generate
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}

const PLACEHOLDERS: Record<GenerationMode, string> = {
  snippet: "A Python function that retries a request with exponential backoff and jitter…",
  component: "A searchable multi-select dropdown with keyboard navigation and chips…",
  app: "A markdown note-taking app with local storage, tag filtering, and a split preview…",
};
