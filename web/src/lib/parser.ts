import { languageForPath } from "./language";

/**
 * Incremental parser for the <plan>/<file>/<notes> output contract defined in
 * `server/src/prompts/system.ts`.
 *
 * It re-parses the whole accumulated buffer on each call rather than keeping a
 * resumable cursor. That's deliberate: the buffer is at most a few hundred KB,
 * a full parse is well under a millisecond, and statelessness means a malformed
 * chunk can never corrupt the parse of everything after it. The caller
 * throttles calls to one per animation frame.
 */

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
  /** False while this file is still streaming in. */
  complete: boolean;
}

export interface ParsedResult {
  plan: string;
  files: ParsedFile[];
  notes: string;
  /** Text the model emitted outside any known block — shown as a fallback. */
  stray: string;
}

const FILE_OPEN = /<file\s+path\s*=\s*["']([^"']+)["']\s*>/gi;

/** Matches a trailing fragment of an opening tag, e.g. `…done.\n<fi`. */
const PARTIAL_TAG = /<\/?[a-z]*$/i;

export function parse(buffer: string): ParsedResult {
  const plan = extractBlock(buffer, "plan");
  const notes = extractBlock(buffer, "notes");
  const files = extractFiles(buffer);

  if (files.length === 0 && !plan && !notes) {
    // The model ignored the contract. Rather than show nothing, fall back to
    // pulling out markdown code fences, and failing that, show the raw text.
    const fallback = extractFencedBlocks(buffer);
    if (fallback.length > 0) return { plan: "", files: fallback, notes: "", stray: "" };
    return { plan: "", files: [], notes: "", stray: trimPartialTag(buffer) };
  }

  return { plan, files, notes, stray: "" };
}

/** Pull one `<tag>…</tag>` block, tolerating a missing close tag mid-stream. */
function extractBlock(buffer: string, tag: string): string {
  const open = buffer.search(new RegExp(`<${tag}\\s*>`, "i"));
  if (open === -1) return "";

  const openTagEnd = buffer.indexOf(">", open);
  if (openTagEnd === -1) return "";

  const close = buffer.toLowerCase().indexOf(`</${tag}>`, openTagEnd);
  const body = close === -1 ? buffer.slice(openTagEnd + 1) : buffer.slice(openTagEnd + 1, close);

  return trimPartialTag(body).trim();
}

function extractFiles(buffer: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const seen = new Set<string>();

  FILE_OPEN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FILE_OPEN.exec(buffer)) !== null) {
    const rawPath = match[1];
    if (!rawPath) continue;

    const path = normalisePath(rawPath);
    const bodyStart = match.index + match[0].length;
    const close = buffer.toLowerCase().indexOf("</file>", bodyStart);
    const complete = close !== -1;
    const raw = complete ? buffer.slice(bodyStart, close) : buffer.slice(bodyStart);

    // A duplicate path means the model restated a file — keep the later, more
    // complete version rather than rendering the same path twice.
    if (seen.has(path)) {
      const existing = files.findIndex((f) => f.path === path);
      if (existing !== -1) files.splice(existing, 1);
    }
    seen.add(path);

    files.push({
      path,
      content: cleanContent(raw, complete),
      language: languageForPath(path),
      complete,
    });

    if (!complete) break;
    FILE_OPEN.lastIndex = close + "</file>".length;
  }

  return files;
}

/**
 * Strip the markdown fence the model sometimes adds despite being told not to,
 * plus the leading/trailing newlines that come from the tag being on its own
 * line. While streaming we only trim the start — trimming the end would make
 * the live view jitter as trailing whitespace arrives and is removed.
 */
function cleanContent(raw: string, complete: boolean): string {
  let text = raw.replace(/^\r?\n/, "");

  const fenceOpen = /^[ \t]*```[a-zA-Z0-9+#-]*[ \t]*\r?\n/;
  if (fenceOpen.test(text)) {
    text = text.replace(fenceOpen, "");
    if (complete) text = text.replace(/\r?\n[ \t]*```[ \t]*\r?\n?\s*$/, "");
  }

  return complete ? text.replace(/\s+$/, "") : trimPartialTag(text);
}

/** `src/App.tsx`, `./src/App.tsx` and `/src/App.tsx` are all the same file. */
function normalisePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\.?\//, "");
}

/**
 * Hide a half-arrived tag so the user never sees `<fi` flicker at the end of
 * the stream. Only strips when the fragment could still become a real tag.
 */
function trimPartialTag(text: string): string {
  return text.replace(PARTIAL_TAG, "");
}

/** Last-resort path: treat ```fenced blocks``` as files. */
function extractFencedBlocks(buffer: string): ParsedFile[] {
  const fence = /```([a-zA-Z0-9+#-]*)\r?\n([\s\S]*?)(?:```|$)/g;
  const files: ParsedFile[] = [];
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = fence.exec(buffer)) !== null) {
    const lang = match[1] || "text";
    const content = match[2] ?? "";
    if (!content.trim()) continue;

    files.push({
      path: `snippet-${index}.${extensionFor(lang)}`,
      content: content.replace(/\s+$/, ""),
      language: lang,
      complete: buffer.slice(match.index).includes("```", 3),
    });
    index += 1;
  }

  return files;
}

const FENCE_EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  tsx: "tsx",
  javascript: "js",
  jsx: "jsx",
  python: "py",
  bash: "sh",
  shell: "sh",
  json: "json",
  css: "css",
  html: "html",
  go: "go",
  rust: "rs",
  java: "java",
  sql: "sql",
  yaml: "yml",
};

function extensionFor(lang: string): string {
  return FENCE_EXTENSIONS[lang.toLowerCase()] ?? "txt";
}
