"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require("dotenv").config();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1) Your “simple” command:
        const userCommand = "make a to-do app";
        // 2) The three prompts:
        const stylePrompt = `
You are a UI/UX expert.  
Generate beautiful, modern, responsive interfaces using current best practices (e.g. React + Tailwind CSS, accessibility, clean layouts, animations where appropriate).
  `.trim();
        const structurePrompt = `
When you generate code, split it into multiple files.  
First list all file paths (e.g. src/App.tsx, src/components/Navbar.tsx, src/components/ToDoList.tsx, etc.).  
Then for each file, output the path followed by the full contents in a code block.  
Use React functional components, hooks, and Tailwind classes.
  `.trim();
        const messages = [
            { role: "system", content: stylePrompt },
            { role: "system", content: structurePrompt },
            { role: "user", content: userCommand },
        ];
        // 3) Fire off the streaming request:
        const response = yield fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
                "HTTP-Referer": "<YOUR_SITE_URL>", // Optional
                "X-Title": "<YOUR_SITE_NAME>", // Optional
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1-zero:free",
                messages,
                stream: true,
            }),
        });
        if (!response.ok) {
            console.error("API error", response.status, yield response.text());
            return;
        }
        // 4) Stream it out, piece by piece:
        if (!response.body) {
            throw new Error("Response body is null");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        process.stdout.write("\n📦 Generating files:\n\n");
        try {
            while (true) {
                const { done, value } = yield reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                let nl;
                while ((nl = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, nl).trim();
                    buffer = buffer.slice(nl + 1);
                    if (!line.startsWith("data: "))
                        continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") {
                        process.stdout.write("\n✅ Done!\n");
                        return;
                    }
                    try {
                        const { choices } = JSON.parse(payload);
                        const chunk = choices[0].delta.content;
                        if (chunk)
                            process.stdout.write(chunk);
                    }
                    catch (_a) {
                        // skip partial JSON
                    }
                }
            }
        }
        finally {
            reader.cancel();
        }
    });
}
main().catch((err) => console.error("Fatal error:", err));
