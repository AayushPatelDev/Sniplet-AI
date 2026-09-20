import { Highlight, themes } from "prism-react-renderer";
import { useEffect, useState } from "react";

interface CodeBlockProps {
  code: string;
  language: string;
  /** Renders a blinking caret at the end while the file is still arriving. */
  streaming?: boolean;
}

/**
 * Syntax-highlighted source with a line-number gutter.
 *
 * Rows are flex, not `display: table-row`. A table row inside <code> (which is
 * `display: inline`) generates an *inline* anonymous table, and the lines end
 * up flowing horizontally. Flex has no such surprise.
 *
 * Lines don't wrap — `min-w-max` on <code> plus `whitespace-pre` lets the <pre>
 * scroll horizontally instead, which keeps indentation readable.
 */
export function CodeBlock({ code, language, streaming = false }: CodeBlockProps) {
  const isDark = useIsDark();

  return (
    <Highlight code={code} language={language} theme={isDark ? themes.vsDark : themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre
          className="overflow-x-auto py-4 font-mono text-[13px] leading-[1.65]"
          style={{ background: "transparent", margin: 0 }}
        >
          <code className="block min-w-max">
            {tokens.map((line, i) => {
              const { key: _key, className, ...lineProps } = getLineProps({ line });
              return (
                <div key={i} {...lineProps} className={`flex ${className ?? ""}`}>
                  <span
                    aria-hidden="true"
                    className="w-14 shrink-0 pr-4 text-right tabular-nums text-faint select-none"
                  >
                    {i + 1}
                  </span>
                  <span className="whitespace-pre pr-6">
                    {line.map((token, key) => {
                      const { key: _tokenKey, ...tokenProps } = getTokenProps({ token });
                      return <span key={key} {...tokenProps} />;
                    })}
                    {streaming && i === tokens.length - 1 && (
                      <span className="animate-blink ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-accent align-middle" />
                    )}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
