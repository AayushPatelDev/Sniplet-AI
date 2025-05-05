import { useState, useEffect, useRef } from "react";
import {
  FiSend,
  FiCopy,
  FiCheck,
  FiCode,
  FiCoffee,
  FiCommand,
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Removed unused theme state

  // Auto-scroll code pane
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [currentCode]);

  // Function to format and clean up code from the API response
  const formatCodeResponse = (text: string) => {
    // Remove the \boxed{ and trailing } if present
    let cleaned = text;
    if (text.startsWith("\\boxed{") && text.endsWith("}")) {
      cleaned = text.substring(7, text.length - 1);
    }
    return cleaned;
  };

  // Extract raw code from markdown for copying
  const extractCodeFromMarkdown = (markdown: string) => {
    // Simple regex to extract code blocks
    const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/g;
    let allCode = "";
    let match;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      allCode += match[2] + "\n\n";
    }

    return allCode.trim() || markdown; // Return original text if no code blocks found
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setCurrentCode("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let codeBuf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        // Process line by line
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            reader.cancel();
            break;
          }

          let json: any;
          try {
            json = JSON.parse(payload);
          } catch {
            continue;
          }
          const text = json.choices?.[0]?.delta?.content;
          if (text) {
            codeBuf += text;
            const formattedCode = formatCodeResponse(codeBuf);
            setCurrentCode(formattedCode);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setCurrentCode("\n// Error fetching code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractCodeFromMarkdown(currentCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="bg-gray-900/80 backdrop-blur-md px-6 py-4 border-b border-indigo-900/30 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FiCode className="text-indigo-400 w-6 h-6" />
          <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Sniplet AI
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FiCommand className="text-indigo-400" />
          <span>Ctrl+Enter to submit</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden max-w-6xl mx-auto w-full">
        {/* PROMPT FORM - Now with better proportions */}
        <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-indigo-900/30 shadow-lg shadow-indigo-900/5 overflow-hidden">
          <div className="border-b border-gray-700/50 bg-gray-800/80 px-5 py-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-200 flex items-center gap-2">
              <FiCoffee className="text-indigo-400" />
              <span>What would you like me to code?</span>
            </h2>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col p-5">
            <textarea
              rows={5}
              className="w-full bg-gray-800/70 border border-gray-700/70 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm mb-4 transition-all shadow-inner"
              placeholder="Describe what code you want... (e.g., 'Create a function to check if a string is a palindrome')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className={`px-6 py-3 self-end flex items-center justify-center gap-2 rounded-lg transition-all shadow-md ${
                isLoading || !prompt.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-800/20 transform hover:-translate-y-0.5"
              }`}
            >
              <FiSend size={18} />
              <span>{isLoading ? "Generating..." : "Generate Code"}</span>
            </button>
          </form>
        </div>

        {/* GENERATED CODE PANEL - Always below prompt box */}
        <div
          className={`flex-1 flex flex-col bg-gray-800/30 backdrop-blur-sm rounded-xl border border-indigo-900/30 overflow-hidden transition-all shadow-lg shadow-indigo-900/5 ${
            isLoading || currentCode ? "opacity-100" : "opacity-60"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-3 bg-gray-800/80 border-b border-gray-700/50">
            <span className="font-medium text-gray-200 flex items-center gap-2">
              <FiCode className="text-indigo-400" />
              <span>Generated Code</span>
            </span>
            <button
              onClick={copyToClipboard}
              disabled={!currentCode && !isLoading}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                !currentCode && !isLoading
                  ? "text-gray-500"
                  : copied
                  ? "bg-green-600/20 text-green-400"
                  : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
              }`}
              title="Copy code"
            >
              {copied ? (
                <>
                  <FiCheck className="text-green-400" />
                  <span className="text-xs font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <FiCopy />
                  <span className="text-xs font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="flex-1 p-5 overflow-auto">
            {isLoading ? (
              <div className="text-gray-300 animate-pulse">
                <div className="h-2 bg-gray-700/50 rounded-full w-4/5 mb-4"></div>
                <div className="h-2 bg-gray-700/50 rounded-full w-1/3 mb-4"></div>
                <div className="h-2 bg-gray-700/50 rounded-full w-3/4 mb-4"></div>
                <div className="h-2 bg-gray-700/50 rounded-full w-2/5 mb-4"></div>
                <div className="absolute bottom-0 right-0 m-8 text-indigo-400 flex items-center">
                  <span className="mr-2">Generating code</span>
                  <span className="flex">
                    <span className="animate-bounce mx-0.5 h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                    <span
                      className="animate-bounce mx-0.5 h-1.5 w-1.5 rounded-full bg-indigo-400"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                    <span
                      className="animate-bounce mx-0.5 h-1.5 w-1.5 rounded-full bg-indigo-400"
                      style={{ animationDelay: "0.4s" }}
                    ></span>
                  </span>
                </div>
              </div>
            ) : currentCode ? (
              <ReactMarkdown
                className="markdown prose prose-invert max-w-none"
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <div className="rounded-lg overflow-hidden my-4">
                        <div className="bg-gray-800/80 text-xs py-1 px-4 border-b border-gray-700/50 text-gray-400">
                          {match[1].toUpperCase()}
                        </div>
                        <SyntaxHighlighter
                          style={atomDark as any}
                          language={match[1]}
                          PreTag="div"
                          className="!bg-gray-800/50 !rounded-t-none"
                          customStyle={{
                            background: "rgba(31, 41, 55, 0.5)",
                            padding: "1rem",
                            margin: 0,
                            borderRadius: "0 0 0.5rem 0.5rem",
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code
                        className={`${className} bg-gray-800/50 px-1.5 py-0.5 rounded`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {currentCode}
              </ReactMarkdown>
            ) : (
              <div className="text-gray-400 h-full flex flex-col items-center justify-center text-center p-8">
                <FiCode className="w-12 h-12 text-indigo-400/50 mb-4" />
                <p className="text-xl font-medium mb-2 text-gray-300">
                  Ready to generate code
                </p>
                <p className="max-w-md text-sm">
                  Enter a prompt above and click "Generate Code" to create your
                  solution
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900/80 backdrop-blur-md py-3 px-6 border-t border-indigo-900/30 text-center text-xs text-gray-500">
        Powered by DeepSeek AI • Built with React and TailwindCSS
      </footer>
    </div>
  );
}
