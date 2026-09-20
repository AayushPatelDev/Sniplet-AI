/**
 * File extension → Prism language id.
 *
 * Deriving the language from the path is why the output contract doesn't need a
 * `lang` attribute on <file> — one less thing for the model to get wrong.
 */
const BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
  svelte: "markup",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  graphql: "graphql",
  gql: "graphql",
  dart: "dart",
  lua: "lua",
  r: "r",
  ex: "elixir",
  exs: "elixir",
};

/** Files that carry no extension but always mean the same thing. */
const BY_FILENAME: Record<string, string> = {
  dockerfile: "docker",
  makefile: "makefile",
  ".gitignore": "bash",
  ".env": "bash",
  ".env.example": "bash",
  "package.json": "json",
  procfile: "bash",
};

export function languageForPath(path: string): string {
  const filename = (path.split("/").pop() ?? path).toLowerCase();

  const byName = BY_FILENAME[filename];
  if (byName) return byName;

  if (filename.startsWith(".env")) return "bash";

  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "text";

  return BY_EXTENSION[filename.slice(dot + 1)] ?? "text";
}
