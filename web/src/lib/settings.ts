import type { GenerationMode, ProviderId } from "./types";

/**
 * Settings live in localStorage, which means they live on this machine only.
 *
 * API keys are part of that. This is a tool you run on your own computer
 * against your own browser profile, so localStorage is an appropriate place for
 * them — but it is not encrypted, and it is readable by anything that can run
 * script on this origin. The README says so plainly, and the alternative
 * (keys in `.env`, never touching the browser) is the documented default.
 */
const STORAGE_KEY = "sniplet.settings.v2";
const THEME_KEY = "sniplet.theme";

export interface Settings {
  provider: ProviderId;
  /** Per-provider model choice, so switching back and forth is lossless. */
  models: Partial<Record<ProviderId, string>>;
  /** Per-provider key. Empty means "use whatever the server has". */
  keys: Partial<Record<ProviderId, string>>;
  baseUrl: string;
  mode: GenerationMode;
  temperature: number;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  models: {},
  keys: {},
  baseUrl: "",
  mode: "snippet",
  temperature: 0.3,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    // Private browsing, disabled storage, or corrupt JSON — defaults are fine.
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not being able to persist a preference shouldn't break the app.
  }
}

export function clearStoredKeys(): void {
  const settings = loadSettings();
  saveSettings({ ...settings, keys: {} });
}

export type Theme = "light" | "dark";

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* fall through */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* preference just won't persist */
  }
}
