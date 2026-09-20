import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "../lib/settings";
import { fetchConfig } from "../lib/api";
import type { ConfigResponse, ProviderId } from "../lib/types";

export interface SettingsState {
  settings: Settings;
  config: ConfigResponse | null;
  loading: boolean;
  /** Set when the server is unreachable — the app can't work without it. */
  configError: string | null;
  update: (patch: Partial<Settings>) => void;
  setModel: (provider: ProviderId, model: string) => void;
  setKey: (provider: ProviderId, key: string) => void;
  /** The provider record currently selected, once config has loaded. */
  activeProvider: ConfigResponse["providers"][number] | null;
  activeModel: string;
  /** True when this provider has neither a server key nor a browser key. */
  needsKey: boolean;
}

export function useSettings(): SettingsState {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stored = loadSettings();

    fetchConfig()
      .then((next) => {
        if (cancelled) return;
        setConfig(next);
        // Only fall back to the server's default provider on a first run —
        // otherwise we'd stomp the user's choice on every reload.
        const hasStoredChoice = localStorage.getItem("sniplet.settings.v2") !== null;
        setSettings(hasStoredChoice ? stored : { ...stored, provider: next.defaultProvider });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setSettings(stored);
        setConfigError(
          err.message.includes("reach")
            ? "Can't reach the Sniplet server. Start it with `npm run dev` and reload."
            : err.message,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => persist({ ...loadSettings(), ...settings, ...patch }),
    [persist, settings],
  );

  const setModel = useCallback(
    (provider: ProviderId, model: string) =>
      persist({ ...settings, models: { ...settings.models, [provider]: model } }),
    [persist, settings],
  );

  const setKey = useCallback(
    (provider: ProviderId, key: string) =>
      persist({ ...settings, keys: { ...settings.keys, [provider]: key } }),
    [persist, settings],
  );

  const activeProvider = config?.providers.find((p) => p.id === settings.provider) ?? null;
  const activeModel = settings.models[settings.provider] ?? activeProvider?.defaultModel ?? "";
  const needsKey = Boolean(
    activeProvider && !activeProvider.hasServerKey && !settings.keys[settings.provider]?.trim(),
  );

  return {
    settings,
    config,
    loading,
    configError,
    update,
    setModel,
    setKey,
    activeProvider,
    activeModel,
    needsKey,
  };
}
