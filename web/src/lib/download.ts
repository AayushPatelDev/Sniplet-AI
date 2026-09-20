import JSZip from "jszip";
import type { ParsedFile } from "./parser";

/** Turn a prompt into something usable as a folder name. */
export function slugify(text: string, fallback = "sniplet-project"): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Bundle the generated files into a zip and hand it to the browser. */
export async function downloadZip(files: ParsedFile[], name: string): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(name) ?? zip;

  for (const file of files) {
    folder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${name}.zip`);
}

export function downloadFile(file: ParsedFile): void {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, file.path.split("/").pop() ?? "file.txt");
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
