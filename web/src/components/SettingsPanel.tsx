import clsx from "clsx";
import { ExternalLink, Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SettingsState } from "../hooks/useSettings";
import type { ProviderId } from "../lib/types";

interface SettingsPanelProps {
  state: SettingsState;
  open: boolean;
  onClose: () => void;
}

/**
 * Provider, model and key configuration.
 *
 * Presented as a dialog rather than a page because it's something you touch
 * once and then forget — burying it behind a route would cost a navigation for
 * a two-field form.
 */
export function SettingsPanel({ state, open, onClose }: SettingsPanelProps) {
  const { settings, config, update, setModel, setKey, activeProvider, activeModel } = state;
  const [revealKey, setRevealKey] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus lands somewhere sensible on open.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const storedKey = settings.keys[settings.provider] ?? "";
  const providers = config?.providers ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="animate-rise card my-auto w-full max-w-xl shadow-[var(--shadow)]"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id="settings-title" className="text-base font-semibold">
            Settings
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost -mr-1.5 px-2"
            aria-label="Close settings"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="space-y-6 p-5">
          {/* ── Provider ───────────────────────────────────────────────── */}
          <fieldset>
            <legend className="label">Provider</legend>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((provider) => {
                const isActive = provider.id === settings.provider;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => update({ provider: provider.id as ProviderId })}
                    aria-pressed={isActive}
                    className={clsx(
                      "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150",
                      isActive
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line-strong text-muted hover:bg-raised hover:text-ink",
                    )}
                  >
                    <span className="block font-medium">{provider.label}</span>
                    {provider.hasServerKey ? (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-success">
                        <ShieldCheck aria-hidden="true" className="size-3" />
                        Key loaded from .env
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-faint">Needs a key</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {activeProvider && (
            <>
              {/* ── Model ────────────────────────────────────────────── */}
              <div>
                <label className="label" htmlFor="model-input">
                  Model
                </label>
                <input
                  id="model-input"
                  className="field font-mono"
                  list="model-options"
                  value={activeModel}
                  onChange={(e) => setModel(settings.provider, e.target.value)}
                  placeholder={activeProvider.defaultModel}
                  spellCheck={false}
                />
                <datalist id="model-options">
                  {activeProvider.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                      {model.note ? ` — ${model.note}` : ""}
                    </option>
                  ))}
                </datalist>
                <p className="mt-1.5 text-xs text-faint">
                  Pick from the list or type any model id this provider accepts.
                </p>
              </div>

              {/* ── Base URL (compatible only) ───────────────────────── */}
              {activeProvider.needsBaseUrl && (
                <div>
                  <label className="label" htmlFor="base-url">
                    Base URL
                  </label>
                  <input
                    id="base-url"
                    className="field font-mono"
                    value={settings.baseUrl}
                    onChange={(e) => update({ baseUrl: e.target.value })}
                    placeholder="https://openrouter.ai/api/v1"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* ── API key ──────────────────────────────────────────── */}
              <div>
                <label className="label" htmlFor="api-key">
                  API key
                  {activeProvider.hasServerKey && (
                    <span className="ml-2 normal-case text-faint">— optional, overrides .env</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="api-key"
                    className="field pr-10 font-mono"
                    type={revealKey ? "text" : "password"}
                    value={storedKey}
                    onChange={(e) => setKey(settings.provider, e.target.value)}
                    placeholder={
                      activeProvider.hasServerKey ? "Using the key from .env" : "Paste your key"
                    }
                    spellCheck={false}
                    autoComplete="off"
                    disabled={!config?.allowClientKeys}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealKey((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-faint hover:text-ink"
                    aria-label={revealKey ? "Hide API key" : "Show API key"}
                  >
                    {revealKey ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {activeProvider.hint}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <a
                    href={activeProvider.keyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Get a key
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                  <span className="text-faint">
                    Stored in this browser only. Sent to your provider, never to us.
                  </span>
                </div>

                {!config?.allowClientKeys && (
                  <p className="mt-2 text-xs text-muted">
                    This server has <code className="font-mono">ALLOW_CLIENT_KEYS=false</code>, so
                    keys must come from <code className="font-mono">.env</code>.
                  </p>
                )}
              </div>

              {/* ── Temperature ──────────────────────────────────────── */}
              <div>
                <label className="label" htmlFor="temperature">
                  Temperature — {settings.temperature.toFixed(1)}
                </label>
                <input
                  id="temperature"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.temperature}
                  onChange={(e) => update({ temperature: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
                <p className="mt-1 flex justify-between text-xs text-faint">
                  <span>Predictable</span>
                  <span>Inventive</span>
                </p>
              </div>
            </>
          )}
        </div>

        <footer className="flex justify-end border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
