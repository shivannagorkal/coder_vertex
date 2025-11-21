// pages/index.js
import { useState } from "react";

export default function Home() {
  const [code, setCode] = useState(`// Example
function add(a, b) {
  return a + b;
}`);
  const [outputType, setOutputType] = useState("tests");
  const [language, setLanguage] = useState("javascript");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult("");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, outputType, language }),
      });
      const j = await r.json();
      if (!r.ok) setResult("Error: " + (j.error || j.detail || JSON.stringify(j)));
      else setResult(j.result || JSON.stringify(j));
    } catch (err) {
      setResult("Error: AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">CV</div>
          <div>
            <h1>Code Vortex</h1>
            <div className="subtitle">AI dev tools — Generate tests, docs, snippets</div>
          </div>
        </div>
        <a className="deploy" href="#" onClick={(e)=>e.preventDefault()}>Deploy</a>
      </header>

      <main className="container">
        <section className="controls">
          <div className="left">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-800 text-white border border-slate-600 rounded px-3 py-2"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>

            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
              className="bg-slate-800 text-white border border-slate-600 rounded px-3 py-2"
            >
              <option value="tests">Generate Unit Tests</option>
              <option value="docs">Generate Docs</option>
              <option value="snippet">Generate Snippet</option>
              <option value="fix">Suggest Fixes</option>
            </select>
          </div>

          <div className="right">
            <button className="btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </section>

        <section className="workspace">
          <div className="editor">
            <label className="label">Code</label>
            <textarea className="codebox" value={code} onChange={(e)=>setCode(e.target.value)} />
          </div>

          <div className="output">
            <label className="label">Output</label>
            <div className="result-box">
              {result ? <pre>{result}</pre> : <div className="muted">No output yet — click Generate</div>}
            </div>

            <div className="output-actions">
              <button className="ghost" onClick={() => navigator.clipboard.writeText(result || "")}>Copy</button>
              <a className="ghost" href={`data:text/plain;charset=utf-8,${encodeURIComponent(result||"")}`} download="ai-output.txt">Download</a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <small>Built for the hackathon • Keep your API key in <code>.env.local</code></small>
          <small>Project brief: <a href="/mnt/data/code vortex.pdf">/mnt/data/code vortex.pdf</a></small>
        </footer>
      </main>
    </div>
  );
}
