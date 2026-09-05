import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface CodeSandboxProps {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  onExportCode?: (codeBundle: string) => void;
}

const DEFAULT_HTML = `<!-- NEOT Sandbox: Semantic Layout -->
<header class="hero">
  <h1>NEOT Learning Portal</h1>
  <p>Learn today, own tomorrow.</p>
</header>
<main class="content">
  <article class="card">
    <h2>Interactive Lab</h2>
    <p>Edit HTML, CSS, and JS above to see live updates!</p>
    <button id="action-btn">Click Me</button>
  </article>
</main>
<footer class="footer">
  <small>&copy; 2026 NEOT. Connected to neot.in</small>
</footer>`;

const DEFAULT_CSS = `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 1rem;
  background: #f8fafc;
  color: #1e293b;
}
.hero {
  background: linear-gradient(135deg, #0284c7, #0f766e);
  color: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  text-align: center;
}
.hero h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
.hero p { margin: 0; opacity: 0.9; }
.content { margin-top: 1rem; }
.card {
  background: white;
  padding: 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
button {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}
button:hover { opacity: 0.9; }
.footer {
  margin-top: 1.5rem;
  text-align: center;
  color: #64748b;
  font-size: 0.8rem;
}`;

const DEFAULT_JS = `document.getElementById('action-btn')?.addEventListener('click', () => {
  alert('🎉 Hello from NEOT interactive runner!');
});`;

export const CodeSandbox: React.FC<CodeSandboxProps> = ({
  initialHtml = DEFAULT_HTML,
  initialCss = DEFAULT_CSS,
  initialJs = DEFAULT_JS,
  onExportCode,
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [copied, setCopied] = useState(false);
  const [previewSrcDoc, setPreviewSrcDoc] = useState('');

  const buildSrcDoc = (h: string, c: string, j: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${c}</style>
      </head>
      <body>
        ${h}
        <script>
          try {
            ${j}
          } catch (err) {
            console.error(err);
          }
        <\/script>
      </body>
    </html>
  `;

  const handleRun = () => {
    setPreviewSrcDoc(buildSrcDoc(html, css, js));
  };

  React.useEffect(() => {
    handleRun();
  }, []);

  const handleReset = () => {
    setHtml(initialHtml);
    setCss(initialCss);
    setJs(initialJs);
    setPreviewSrcDoc(buildSrcDoc(initialHtml, initialCss, initialJs));
  };

  const handleCopy = async () => {
    const fullBundle = `<!-- HTML -->\n${html}\n\n/* CSS */\n${css}\n\n// JS\n${js}`;
    await navigator.clipboard.writeText(fullBundle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (onExportCode) {
      const fullBundle = `<!-- HTML -->\n${html}\n\n/* CSS */\n${css}\n\n// JS\n${js}`;
      onExportCode(fullBundle);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl my-4 text-slate-100 flex flex-col">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-mono text-sm border border-teal-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">NEOT Code Sandbox</h4>
            <p className="text-[11px] text-slate-400">Live HTML / CSS / JavaScript Lab</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('html')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'html' ? 'bg-teal-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setActiveTab('css')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'css' ? 'bg-teal-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            CSS
          </button>
          <button
            onClick={() => setActiveTab('js')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'js' ? 'bg-teal-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            JavaScript
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg shadow transition-colors"
            title="Execute code in preview"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            title="Reset code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            title="Copy bundle"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onExportCode && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Use in Assignment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 h-96">
        <div className="h-full flex flex-col bg-slate-950/40">
          <div className="px-3 py-1.5 bg-slate-950/60 text-[11px] font-mono text-slate-400 border-b border-slate-900 flex justify-between">
            <span>{activeTab.toUpperCase()} EDITOR</span>
            <span>UTF-8</span>
          </div>
          {activeTab === 'html' && (
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="w-full flex-1 p-3 bg-transparent text-teal-200 font-mono text-xs resize-none outline-none focus:ring-0 leading-relaxed"
              spellCheck={false}
            />
          )}
          {activeTab === 'css' && (
            <textarea
              value={css}
              onChange={e => setCss(e.target.value)}
              className="w-full flex-1 p-3 bg-transparent text-cyan-200 font-mono text-xs resize-none outline-none focus:ring-0 leading-relaxed"
              spellCheck={false}
            />
          )}
          {activeTab === 'js' && (
            <textarea
              value={js}
              onChange={e => setJs(e.target.value)}
              className="w-full flex-1 p-3 bg-transparent text-amber-200 font-mono text-xs resize-none outline-none focus:ring-0 leading-relaxed"
              spellCheck={false}
            />
          )}
        </div>

        <div className="h-full flex flex-col bg-slate-950/20">
          <div className="px-3 py-1.5 bg-slate-950/60 text-[11px] font-mono text-slate-400 border-b border-slate-900 flex justify-between items-center">
            <span>LIVE PREVIEW</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
          <iframe
            title="NEOT Live Preview"
            srcDoc={previewSrcDoc}
            sandbox="allow-scripts allow-modals"
            className="w-full flex-1 border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
};
