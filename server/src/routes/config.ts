import { Router } from "express";
import { config, serverKeyFor } from "../config.js";
import { providerList } from "../providers/registry.js";
import type { ConfigResponse } from "../types.js";

/**
 * Tells the browser which providers exist and which ones already have a key on
 * the server, so the UI can prompt for a key only when one is actually needed.
 * Note what is NOT here: the keys themselves, only whether they exist.
 */
export const configRouter = Router();

configRouter.get("/config", (_req, res) => {
  const body: ConfigResponse = {
    defaultProvider: config.DEFAULT_PROVIDER,
    defaultModel: config.DEFAULT_MODEL ?? null,
    allowClientKeys: config.ALLOW_CLIENT_KEYS,
    providers: providerList.map((p) => ({
      id: p.id,
      label: p.label,
      hasServerKey: Boolean(serverKeyFor(p.id)),
      needsBaseUrl: p.needsBaseUrl,
      defaultModel:
        p.id === "compatible" ? (config.COMPATIBLE_MODEL ?? p.defaultModel) : p.defaultModel,
      models: p.models,
      keyUrl: p.keyUrl,
      hint: p.hint,
    })),
  };
  res.json(body);
});
