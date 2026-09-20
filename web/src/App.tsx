import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { ResultPanel } from "./components/ResultPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useGeneration } from "./hooks/useGeneration";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  const settingsState = useSettings();
  const generation = useGeneration();

  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { settings, activeProvider, activeModel, needsKey, configError, loading } = settingsState;

  const submit = useCallback(() => {
    // Rather than silently failing on a missing key, send them where the fix is.
    if (needsKey) {
      setSettingsOpen(true);
      return;
    }

    const key = settings.keys[settings.provider]?.trim();
    const baseUrl = settings.baseUrl.trim();

    void generation.run({
      prompt,
      mode: settings.mode,
      provider: settings.provider,
      temperature: settings.temperature,
      ...(activeModel ? { model: activeModel } : {}),
      ...(key ? { apiKey: key } : {}),
      ...(baseUrl && activeProvider?.needsBaseUrl ? { baseUrl } : {}),
    });
  }, [needsKey, settings, prompt, activeModel, activeProvider, generation]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {configError && (
          <div
            role="alert"
            className="mb-4 flex gap-3 rounded-[var(--radius-card)] border p-4"
            style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            <p className="text-sm leading-relaxed">{configError}</p>
          </div>
        )}

        <Composer
          prompt={prompt}
          onPromptChange={setPrompt}
          mode={settings.mode}
          onModeChange={(mode) => settingsState.update({ mode })}
          onSubmit={submit}
          onCancel={generation.cancel}
          onOpenSettings={() => setSettingsOpen(true)}
          streaming={generation.status === "streaming"}
          disabled={loading || Boolean(configError)}
          providerLabel={activeProvider?.label ?? "Loading…"}
          model={activeModel}
          needsKey={needsKey}
        />

        <div className="mt-6">
          <ResultPanel
            generation={generation}
            prompt={prompt}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </main>

      <footer className="border-t border-line px-4 py-4">
        <p className="mx-auto max-w-4xl text-xs text-faint">
          Runs on your machine. Your keys go to your provider and nowhere else.
        </p>
      </footer>

      <SettingsPanel
        state={settingsState}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
