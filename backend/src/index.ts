import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import type { Request, Response } from "express";

dotenv.config();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY in .env");
  process.exit(1);
}
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.post(
  "/api/generate",
  // Explicitly type the handler as returning Promise<void>
  async (req: Request, res: Response): Promise<void> => {
    const { prompt } = req.body;
    if (typeof prompt !== "string" || !prompt.trim()) {
      // —> just send and exit, don’t return the res object
      res.status(400).json({ error: "Missing prompt" });
      return;
    }
    const stylePrompt = `
You are a UI/UX expert.
Generate beautiful, modern, responsive interfaces using current best practices
(e.g. React + Tailwind CSS, accessibility, clean layouts, animations).
  `.trim();

    const structurePrompt = `
When you generate code, split it into multiple files.
First list all file paths (e.g. src/App.tsx, src/components/Navbar.tsx).
Then for each file, output the path followed by the full contents in a code block.
Use React functional components, hooks, and Tailwind classes.
  `.trim();

    const messages = [
      { role: "system", content: stylePrompt },
      { role: "system", content: structurePrompt },
      { role: "user", content: prompt },
    ];

    try {
      const llmRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-r1-zero:free",
            messages,
            stream: true,
          }),
        }
      );

      if (!llmRes.ok) {
        const text = await llmRes.text();
        res.status(llmRes.status).json({ error: text });
        return;
      }

      // Proxy the SSE stream back to the client
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      llmRes.body!.pipe(res);
      llmRes.body!.on("end", () => res.end());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
