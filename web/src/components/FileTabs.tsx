import clsx from "clsx";
import { FileCode2, Loader2 } from "lucide-react";
import type { ParsedFile } from "../lib/parser";

interface FileTabsProps {
  files: ParsedFile[];
  activePath: string;
  onSelect: (path: string) => void;
}

/**
 * Horizontal file switcher. Tabs rather than a tree: generated projects are a
 * dozen files at most, and a flat list is faster to scan than a nested one.
 */
export function FileTabs({ files, activePath, onSelect }: FileTabsProps) {
  if (files.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Generated files"
      className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2"
    >
      {files.map((file) => {
        const isActive = file.path === activePath;
        return (
          <button
            key={file.path}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(file.path)}
            title={file.path}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5",
              "font-mono text-xs transition-colors duration-150",
              isActive
                ? "border-line bg-code text-ink"
                : "border-transparent text-muted hover:bg-raised hover:text-ink",
            )}
          >
            {file.complete ? (
              <FileCode2 aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />
            ) : (
              <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-accent" />
            )}
            <span className="max-w-50 truncate">{shortPath(file.path)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** `src/components/ui/Button.tsx` → `ui/Button.tsx` — enough to disambiguate. */
function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length <= 2 ? path : parts.slice(-2).join("/");
}
