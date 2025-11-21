// pages/api/generate.js
// Local-first generator: tries OpenAI/Groq if keys present, otherwise returns local templates.
// This keeps your app demo-ready even if external APIs fail.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, outputType = "tests", language = "javascript", fileUrl } = req.body || {};

  // Basic validation: if no code and no fileUrl -> error
  if (!code && !fileUrl) return res.status(400).json({ error: "Missing fields (code or fileUrl required)" });

  // --- Try OpenAI if key exists (optional) ---
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_KEY) {
    try {
      const prompt = `You are an expert developer assistant.
Generate ${outputType} for the following ${language || "code"}:

\`\`\`
${code || ""}
\`\`\`

Respond ONLY with clear markdown or code blocks.`;
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });
      const raw = await resp.text();
      if (resp.ok) {
        const data = JSON.parse(raw);
        const result = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "No response";
        return res.status(200).json({ result, modelUsed: "openai/gpt-3.5-turbo" });
      } else {
        console.error("OpenAI error", resp.status, raw);
        // fall through to local fallback
      }
    } catch (e) {
      console.error("OpenAI fetch failed:", e?.message || e);
      // fall through to next option
    }
  }

  // --- Try Groq if key exists (optional) ---
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (GROQ_KEY) {
    try {
      const prompt = `You are an expert developer assistant.
Generate ${outputType} for the following ${language || "code"}:

\`\`\`
${code || ""}
\`\`\`

Respond ONLY with clear markdown or code blocks.`;
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });
      const raw = await resp.text();
      if (resp.ok) {
        const data = JSON.parse(raw);
        const result = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "No response";
        return res.status(200).json({ result, modelUsed: "groq/llama3" });
      } else {
        console.error("Groq error", resp.status, raw);
        // fall through to local fallback
      }
    } catch (e) {
      console.error("Groq fetch failed:", e?.message || e);
      // fall through to fallback
    }
  }

  // --- Local template fallback (guaranteed, no external deps) ---
  // Very simple heuristic templates — extend as needed.
  const localTemplates = {
    tests: (codeText) => {
      // try to find add-like function
      if (/function\s+add\s*\(/.test(codeText) || /const\s+add\s*=\s*\(/.test(codeText)) {
        return `\`\`\`js
import { expect } from 'chai';
import { add } from './yourfile';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1,2)).to.equal(3);
  });
});
\`\`\``;
      }
      // generic test template
      return `\`\`\`js
// Example unit test (generated)
describe('myFunction', () => {
  it('basic behavior', () => {
    // replace with real assertions
    // expect(myFunction(input)).to.equal(expected);
  });
});
\`\`\``;
    },

    docs: (codeText) => {
      return `\`\`\`md
### Function documentation (auto)
\`\`\`
${codeText}
\`\`\`

**Description**
- Brief description: Add a short sentence describing what the code does.

**Parameters**
- list parameters and types

**Returns**
- describe return value
\`\`\``;
    },

    snippet: (codeText) => {
      return `\`\`\`js
// Suggested snippet based on your code:
${codeText}

console.log('Example usage...');
\`\`\``;
    },

    fix: (codeText) => {
      return `\`\`\`md
Suggested fix (example):
- Check edge case X
- Ensure inputs are validated

Example patched code:
\`\`\`js
${codeText}
\`\`\`
\`\`\``;
    },
  };

  const src = code || "";
  const generator = localTemplates[outputType] || localTemplates["tests"];
  const result = generator(src);

  return res.status(200).json({
    result,
    modelUsed: "local-fallback",
    warning: "Using local template fallback — replace with an API key for richer output."
  });
}
