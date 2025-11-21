// pages/api/generate.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { code, outputType, language } = req.body || {};
  if (!code || !outputType) return res.status(400).json({ error: "Missing fields" });

  // If you explicitly want to force the offline fallback (free), set FORCE_FALLBACK=true
  if (process.env.FORCE_FALLBACK === "true") {
    const fallback = `# Demo fallback
Unable to reach a working LLM model from this deployment. Below is a demo ${outputType} for the given ${language || "code"}:

\`\`\`js
// Example unit test (fallback)
import { expect } from 'chai';
import { add } from './yourfile';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1,2)).to.equal(3);
  });
});
\`\`\`
`;
    return res.status(200).json({ result: fallback, warning: "Offline fallback used" });
  }

  // Otherwise -- attempt live LLM providers (Groq or OpenAI) as before.
  // --- Try OpenAI first (if OPENAI_API_KEY exists) ---
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const prompt = `Generate ${outputType} for the following ${language || "code"}:\n\n\`\`\`\n${code}\n\`\`\`\nRespond with just code/markdown.`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });
      const text = await r.text();
      if (!r.ok) {
        let parsed;
        try { parsed = JSON.parse(text); } catch(e) { parsed = text; }
        console.error("OpenAI error:", r.status, parsed);
        // fall through to Groq attempt or fallback
      } else {
        const data = JSON.parse(text);
        const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "No response";
        return res.status(200).json({ result, modelUsed: "openai:gpt-3.5-turbo" });
      }
    } catch (err) {
      console.error("OpenAI fetch error:", err);
    }
  }

  // --- Try Groq if GROQ_API_KEY exists (best-effort) ---
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const prompt = `Generate ${outputType} for the following ${language || "code"}:\n\n\`\`\`\n${code}\n\`\`\`\nRespond with just code/markdown.`;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama3-13b", // try a small model; change if you have access
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });
      const text = await r.text();
      if (r.ok) {
        const data = JSON.parse(text);
        const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "No response";
        return res.status(200).json({ result, modelUsed: "groq:llama3-13b" });
      } else {
        console.error("Groq returned non-OK:", r.status, text);
      }
    } catch (err) {
      console.error("Groq fetch error:", err);
    }
  }

  // final fallback if no providers worked
  const fallback = `# Demo fallback
Unable to reach a working LLM model from this deployment. Below is a demo ${outputType} for the given ${language || "code"}:

\`\`\`js
// Example unit test (fallback)
import { expect } from 'chai';
import { add } from './yourfile';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1,2)).to.equal(3);
  });
});
\`\`\`
`;
  return res.status(200).json({ result: fallback, warning: "Offline fallback used" });
}
