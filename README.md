# Sniplet AI

A local-first AI code generator that you run on your own machine with your own
API key.

Describe what you want, and Sniplet asks your model for a **structured** answer —
a short plan, complete files, and setup notes — then streams them into a live
file browser you can copy or download as a zip.

It works with **OpenAI**, **Anthropic (Claude)**, **Google (Gemini)**, and
anything that speaks the OpenAI API, including **local models** via Ollama or
LM Studio.

```
┌──────────────┐     /api/generate     ┌──────────────┐     provider SDK
│   Browser    │ ────── (SSE) ───────▶ │ Local server │ ──────────────────▶ OpenAI
│  React + TS  │ ◀───── events ─────── │   Express    │                     Anthropic
└──────────────┘                       └──────────────┘                     Gemini
                                                                            Ollama / …
```

---

## Table of contents

- [What you need](#what-you-need)
- [Setup](#setup)
- [Getting an API key](#getting-an-api-key)
- [Running it](#running-it)
- [Using a local model (free)](#using-a-local-model-free)
- [How to use the app](#how-to-use-the-app)
- [Where your keys live](#where-your-keys-live)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Adding a provider](#adding-a-provider)
- [Configuration reference](#configuration-reference)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [What changed in v2](#what-changed-in-v2)

---

## What you need

- **Node.js 20.10 or newer** — check with `node -v`. Get it from
  [nodejs.org](https://nodejs.org) or `brew install node`.
- **An API key** from at least one provider (see below), *or* a local model
  running through Ollama, which costs nothing.

That's it. No database, no Docker, no account, no cloud service.

---

## Setup

```bash
git clone https://github.com/AayushPatelDev/Sniplet-AI.git
cd Sniplet-AI
npm install
```

`npm install` sets up both the server and the web app — they're npm workspaces,
so one install covers the whole repo.

Then create your config file:

```bash
cp .env.example .env
```

Open `.env` and paste in a key for whichever provider you want to use. You only
need one:

```ini
DEFAULT_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

`.env` is gitignored. It will not be committed.

> **Prefer not to keep a key in a file?** Skip `.env` entirely. Start the app and
> paste your key into the in-app **Settings** panel instead — it's stored in your
> browser's localStorage on this machine. See
> [Where your keys live](#where-your-keys-live).

---

## Getting an API key

| Provider | Where to get a key | Notes |
| --- | --- | --- |
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Starts with `sk-`. Needs a funded account — a ChatGPT Plus subscription does **not** include API access. |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Starts with `sk-ant-`. Buy credits in the Console first. |
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Starts with `AIza`. **Has a free tier** with daily limits — the cheapest way to try this. |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | One key, many models. Use the `OpenAI-compatible` provider with base URL `https://openrouter.ai/api/v1`. |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | Very cheap for code. Base URL `https://api.deepseek.com/v1`. |

Each provider bills **your** account directly. Sniplet adds nothing and sees
nothing.

---

## Running it

```bash
npm run dev
```

That starts both halves:

- **Web app** → <http://localhost:5173> ← open this one
- **API server** → <http://localhost:3001>

Open <http://localhost:5173> and you're ready.

To stop, press `Ctrl+C`.

<details>
<summary>Running a production build instead</summary>

```bash
npm run build
npm start                       # serves the API on :3001
npm run preview --workspace web # serves the built web app
```

</details>

---

## Using a local model (free)

If you'd rather not pay anyone, run a model on your own hardware.

**1. Install [Ollama](https://ollama.com) and pull a code model:**

```bash
ollama pull qwen2.5-coder
```

**2. Point Sniplet at it** — either in `.env`:

```ini
DEFAULT_PROVIDER=compatible
COMPATIBLE_BASE_URL=http://localhost:11434/v1
COMPATIBLE_API_KEY=ollama
COMPATIBLE_MODEL=qwen2.5-coder
```

…or in the app's **Settings** panel: choose **OpenAI-compatible**, set the base
URL to `http://localhost:11434/v1`, the key to `ollama` (Ollama ignores it, but
one must be present), and the model to `qwen2.5-coder`.

LM Studio works the same way with base URL `http://localhost:1234/v1`.

> Smaller local models follow the output format less reliably than hosted ones.
> Sniplet falls back to reading markdown code fences when the structure doesn't
> come back as asked, so you'll still get usable output.

---

## How to use the app

**Pick a mode.** It changes the system prompt the model receives:

| Mode | What you get |
| --- | --- |
| **Snippet** | A focused function, script, or utility. Usually one file, no scaffolding. |
| **Component** | One self-contained UI piece — typed props, accessible markup, responsive, with loading and error states. |
| **App** | A small runnable project: entry point, package manifest, config, and a README. |

**Write your prompt** and press `Enter` (or `Shift+Enter` for a new line).

**While it streams**, the plan appears first, then each file fills in with a
caret showing where the model is writing. Hit **Stop** at any time — that
cancels the upstream request so you stop paying for tokens you won't read.

**When it's done**, use **Copy** for the open file, **File** to download it, or
**Zip** to download the whole project.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Enter` | Generate |
| `Shift` + `Enter` | New line |
| `Cmd`/`Ctrl` + `K` | Focus the prompt |
| `Esc` | Close Settings |

---

## Where your keys live

There are two places a key can be, and you choose:

**1. In `.env` on your machine (default).** The key never enters your browser.
The server reads it at startup and uses it to call the provider. This is the
safer option and the one to prefer.

**2. In the app's Settings panel.** The key is saved in your browser's
`localStorage` and sent with each request to your own local server, which
forwards it to the provider. Convenient if you switch keys often or don't want a
file on disk.

What's true either way:

- Keys go to **your provider and nowhere else**. There is no telemetry, no
  analytics, and no third-party endpoint in this codebase.
- Keys are **redacted from server logs** before anything is printed.
- Error messages from provider SDKs are **scrubbed** before reaching the browser,
  so a key can't leak through an error.

Honest caveats about option 2: `localStorage` is not encrypted, and anything
that can run JavaScript on `localhost:5173` can read it. That's an acceptable
trade for a tool running on your own machine against your own browser profile —
but if that bothers you, use `.env` and set `ALLOW_CLIENT_KEYS=false`.

**Do not expose this server to the internet.** It has no authentication by
design, because it's meant for `localhost`. Anyone who can reach it can spend
your API credit.

---

## How it works

### The output contract

The interesting part of Sniplet isn't the API call — it's asking for output
that software can actually work with.

Every request carries a system prompt that demands this exact shape:

```
<plan>
- Short bullets on what's being built and why
</plan>

<file path="src/debounce.ts">
the complete file contents, no markdown fences
</file>

<file path="src/debounce.example.ts">
…
</file>

<notes>
Install commands, caveats, anything you have to do by hand.
</notes>
```

**Why tags and not JSON?** JSON would require escaping every newline and quote
in the generated code — that burns tokens, invites truncation, and can't be
parsed at all until the closing brace arrives. Tags stream cleanly, and a
half-received file is still a perfectly readable half-received file.

**Why no markdown fences inside `<file>`?** Generated code is frequently itself
markdown, or contains fenced examples. A delimiter that can appear in the
payload isn't a delimiter.

The client parses this incrementally ([`web/src/lib/parser.ts`](web/src/lib/parser.ts)),
which is how the file tabs appear and fill in as the model writes, rather than
everything landing at once at the end. When a model ignores the format anyway,
the parser falls back to markdown code fences, and then to raw text.

### One stream format, every provider

The browser never talks to a model vendor. It talks to the local server, which
normalises all four providers down to one event stream:

```jsonc
{"type":"start","provider":"anthropic","model":"claude-sonnet-5"}
{"type":"delta","text":"<plan>\n- Build"}
{"type":"delta","text":" a debounce"}
{"type":"done","usage":{"inputTokens":812,"outputTokens":496}}
```

Switching from OpenAI to Claude changes a dropdown, not a line of client code.
Errors travel on the same stream, already translated into something actionable —
a 401 becomes *"Anthropic rejected the API key. Check that it's correct, active,
and has credit."*

---

## Project structure

```
Sniplet-AI/
├── .env                      your keys (gitignored, you create this)
├── .env.example              template with every option documented
├── package.json              workspace root — `npm run dev` starts both halves
│
├── server/                   Express API
│   └── src/
│       ├── index.ts          bootstrap, CORS, error handling
│       ├── config.ts         .env loading, validated with zod
│       ├── types.ts          the wire contract
│       ├── prompts/
│       │   └── system.ts     ← the prompt engineering lives here
│       ├── providers/
│       │   ├── types.ts      the Provider interface
│       │   ├── openai.ts     OpenAI + any OpenAI-compatible endpoint
│       │   ├── anthropic.ts  Claude
│       │   ├── google.ts     Gemini
│       │   └── registry.ts
│       ├── routes/
│       │   ├── config.ts     GET  /api/config
│       │   └── generate.ts   POST /api/generate  (SSE)
│       └── lib/
│           ├── sse.ts        server-sent-event writer
│           └── errors.ts     provider errors → human messages, key redaction
│
└── web/                      React + Vite + Tailwind v4
    └── src/
        ├── App.tsx
        ├── components/       Composer, ResultPanel, SettingsPanel, CodeBlock…
        ├── hooks/
        │   ├── useGeneration.ts   owns the stream, parse, and cancellation
        │   └── useSettings.ts     provider/model/key state
        ├── lib/
        │   ├── parser.ts     ← the incremental output parser
        │   ├── api.ts        SSE client
        │   ├── settings.ts   localStorage
        │   └── download.ts   copy + zip export
        └── styles/index.css  the design tokens
```

---

## Adding a provider

One file, one line. Implement the `Provider` interface:

```ts
// server/src/providers/mistral.ts
import type { Provider, CompletionParams, ProviderChunk } from "./types.js";

async function* stream(params: CompletionParams): AsyncGenerator<ProviderChunk> {
  // call your SDK, yield { type: "text", text } per chunk,
  // then optionally { type: "usage", usage }
}

export const mistralProvider: Provider = {
  id: "mistral",
  label: "Mistral",
  defaultModel: "mistral-large-latest",
  needsBaseUrl: false,
  keyUrl: "https://console.mistral.ai/api-keys",
  hint: "Keys are created in the Mistral console.",
  models: [{ id: "mistral-large-latest", label: "Mistral Large" }],
  stream,
};
```

Then add `"mistral"` to `PROVIDER_IDS` in `server/src/types.ts` and register it
in `server/src/providers/registry.ts`. The route, the prompts, the settings UI,
and the model picker all pick it up automatically — there's nothing else to
touch.

---

## Configuration reference

Everything below goes in `.env` at the repo root.

| Variable | Default | What it does |
| --- | --- | --- |
| `DEFAULT_PROVIDER` | `openai` | Which provider to select on first run. One of `openai`, `anthropic`, `google`, `compatible`. |
| `DEFAULT_MODEL` | *(provider's default)* | Pin a specific model. |
| `OPENAI_API_KEY` | — | Your OpenAI key. |
| `ANTHROPIC_API_KEY` | — | Your Anthropic key. |
| `GOOGLE_API_KEY` | — | Your Gemini key. |
| `COMPATIBLE_BASE_URL` | — | Base URL for any OpenAI-compatible endpoint. |
| `COMPATIBLE_API_KEY` | — | Key for that endpoint. |
| `COMPATIBLE_MODEL` | — | Model id for that endpoint. |
| `PORT` | `3001` | API server port. |
| `ALLOW_CLIENT_KEYS` | `true` | Whether the browser may supply its own key. Set `false` to force `.env` only. |
| `CORS_ORIGIN` | localhost dev ports | Override the allowed browser origin. |

---

## Scripts

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API server and web app together. |
| `npm run dev:server` | API server only. |
| `npm run dev:web` | Web app only. |
| `npm run build` | Type-check and build both for production. |
| `npm start` | Run the built API server. |
| `npm run typecheck` | Type-check everything without emitting. |

---

## Troubleshooting

**"Can't reach the Sniplet server"**
The API server isn't running. Use `npm run dev` from the repo root — running
`npm run dev --workspace web` alone starts only the front end.

**"No API key for …"**
Either the `.env` variable for that provider is empty, or you haven't pasted a
key in Settings. If you just edited `.env`, restart the server — it's read once
at startup.

**"… rejected the API key"**
The key is wrong, revoked, or the account has no credit. For OpenAI in
particular: a ChatGPT subscription is separate from API billing, and you need
the latter.

**"… doesn't recognise that model"**
Model ids change. Open Settings and pick another from the list, or type any id
your provider currently accepts — the field is free text on purpose.

**"Couldn't reach …" with a local model**
Ollama isn't running (`ollama serve`) or the model isn't pulled
(`ollama pull qwen2.5-coder`). Confirm with `curl http://localhost:11434/v1/models`.

**Port 3001 or 5173 already in use**
Change `PORT` in `.env` for the API. For the web app, edit `server.port` in
`web/vite.config.ts` — and if you change the API port, update the proxy target
there too.

**Output looks like plain text instead of files**
The model didn't follow the output format. Smaller local models do this most.
Try a stronger model, or lower the temperature in Settings.

---

## What changed in v2

Version 1 was a single-vendor demo: one hardcoded DeepSeek model behind a shared
key the author paid for. This version is a tool you own.

| | v1 | v2 |
| --- | --- | --- |
| **Model** | DeepSeek R1, hardcoded | OpenAI, Anthropic, Gemini, or any OpenAI-compatible endpoint |
| **Key** | The author's, shared by everyone | Yours, on your machine |
| **Backend** | One 90-line file, DeepSeek's raw SSE piped straight to the browser | Provider adapters behind one interface, one normalised event stream |
| **Errors** | Stack traces or silence | Translated to plain language, keys redacted |
| **Output** | Markdown blob, `\boxed{}` stripped by regex | A structured contract parsed into a live file tree |
| **Styling** | ~200 Tailwind classes — with Tailwind never installed | Tailwind v4, a real token system, light and dark |
| **Cancellation** | None | Stop button aborts the upstream request |
| **Types** | `strict` on, `any` throughout | Strict end to end, zod-validated at the boundary |
| **Repo** | `node_modules/` committed | Workspaces, one `npm install` |

---

## License

MIT
