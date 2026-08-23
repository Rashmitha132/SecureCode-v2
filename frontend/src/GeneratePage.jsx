// GeneratePage.jsx
// Redesigned AI Code Generation Studio for SecureCode (Linear/Vercel Aesthetic)
// Clean, modern, lightweight with complete Light and Dark theme support.

import { useState, useMemo } from 'react';
import {
  Wand2,
  Code2,
  Copy,
  Check,
  Wrench,
  Sparkles,
  Loader2,
  AlertTriangle,
  Cpu,
  Clock,
  Zap,
  ChevronRight,
  Terminal,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import RepairView from './RepairView';

const API_URL = 'http://localhost:4000';

const LANGUAGES = [
  { key: 'python',     label: 'Python',     ext: 'main.py',     hljsLang: 'python' },
  { key: 'javascript', label: 'JavaScript', ext: 'index.js',    hljsLang: 'javascript' },
  { key: 'typescript', label: 'TypeScript', ext: 'app.ts',      hljsLang: 'typescript' },
  { key: 'java',       label: 'Java',       ext: 'Main.java',   hljsLang: 'java' },
  { key: 'go',         label: 'Go',         ext: 'main.go',     hljsLang: 'go' },
  { key: 'cpp',        label: 'C++',        ext: 'main.cpp',    hljsLang: 'cpp' },
];

const EXAMPLE_PROMPTS = [
  'Write a Python authentication function that securely hashes passwords with bcrypt and issues JWT tokens.',
  'Implement a thread-safe in-memory LRU cache in Go with TTL expiration and mutex locking.',
  'Create a parameterized SQLite database client in JavaScript with prepared queries to prevent SQL injection.',
  'Write a TypeScript input validation helper that sanitizes emails, URLs, and alphanumeric usernames.',
];

export default function GeneratePage({ onAnalyzeCode }) {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('python');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [genMeta, setGenMeta] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-repair state
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairData, setRepairData] = useState(null);
  const [repairError, setRepairError] = useState(null);

  const selectedLang = LANGUAGES.find((l) => l.key === language) || LANGUAGES[0];
  const hasCode = Boolean(generatedCode);

  // Helper to strip markdown code fences and trim trailing newlines
  function cleanSnippet(raw) {
    if (!raw) return '';
    let code = raw.trim();
    if (code.startsWith('```')) {
      const firstLineEnd = code.indexOf('\n');
      if (firstLineEnd !== -1) {
        code = code.slice(firstLineEnd + 1);
      }
      if (code.endsWith('```')) {
        code = code.slice(0, -3);
      }
    }
    return code.trimEnd();
  }

  // Compute exact line count matching rendered code
  const lines = generatedCode ? cleanSnippet(generatedCode).split('\n') : [];
  const lineCount = lines.length;

  // Safe highlighted code html with preserved newlines & syntax highlighting
  const highlightedCodeHtml = useMemo(() => {
    if (!generatedCode) return '';
    const clean = cleanSnippet(generatedCode);
    try {
      if (hljs.getLanguage(selectedLang.hljsLang)) {
        return hljs.highlight(clean, { language: selectedLang.hljsLang }).value;
      }
      return hljs.highlightAuto(clean).value;
    } catch {
      return clean
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [generatedCode, selectedLang]);

  // Call real AI code generation API
  async function handleGenerate(overridePrompt = null) {
    const promptToUse = (typeof overridePrompt === 'string' ? overridePrompt : prompt).trim();
    if (!promptToUse || isGenerating) return;

    if (overridePrompt) {
      setPrompt(overridePrompt);
    }

    setIsGenerating(true);
    setError(null);
    setRepairData(null);
    setRepairError(null);
    setGeneratedCode('');
    setGenMeta(null);

    const startedAt = Date.now();

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse, language }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const elapsedMs = Date.now() - startedAt;
      const cleanCode = cleanSnippet(data.code || '');

      setGeneratedCode(cleanCode);
      setGenMeta({
        model: data.model || 'Groq LLaMA-3.3-70B',
        tokensUsed: data.tokensUsed || Math.round(cleanCode.length / 4),
        generationMs: data.generationMs || elapsedMs,
        generatedAt: data.generatedAt || new Date().toISOString(),
      });
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to backend server on localhost:4000.'
          : err.message
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // Copy to clipboard
  function handleCopy() {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Analyze code (navigate to scan or trigger scan)
  function handleAnalyze() {
    if (!generatedCode || !onAnalyzeCode) return;
    onAnalyzeCode(generatedCode, language);
  }

  // Auto-Repair via real API
  async function handleAutoRepair() {
    if (!generatedCode || isRepairing) return;
    setIsRepairing(true);
    setRepairError(null);

    try {
      const res = await fetch(`${API_URL}/api/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode,
          language,
          findings: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Repair failed (${res.status})`);
      }

      const data = await res.json();
      setRepairData(data);
    } catch (err) {
      setRepairError(err.message || 'Failed to auto-repair code');
    } finally {
      setIsRepairing(false);
    }
  }

  // Accept repair patch
  function handleAcceptRepair(newCode) {
    setGeneratedCode(newCode);
    setRepairData(null);
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className="v2-gen-wrapper">
      {/* ── 1. Top Section: Title + Description ── */}
      <header className="v2-gen-header">
        <div className="v2-gen-header-title">
          <div className="v2-gen-tag">
            <Wand2 size={13} className="v2-tag-icon" />
            <span>AI Code Synthesizer</span>
          </div>
          <h1>Generate Code</h1>
          <p className="hide-on-mobile">Describe what you need → AI generates secure code → Analyze or repair it</p>
        </div>
      </header>

      {/* ── 2. Prompt Section: Large Textarea ── */}
      <section className="v2-gen-card">
        <div className="v2-gen-section-header">
          <label htmlFor="gen-prompt-input" className="v2-gen-label">
            Describe what you need
          </label>
          <span className="v2-gen-shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
          </span>
        </div>

        <div className="v2-prompt-textarea-wrapper">
          <textarea
            id="gen-prompt-input"
            className="v2-gen-prompt-textarea"
            placeholder="e.g., Write a Python function that securely hashes passwords using bcrypt, validates password complexity, and creates JWT tokens with expiration."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            disabled={isGenerating}
            spellCheck="false"
          />
        </div>

        {/* Quick Example Inspiration Chips */}
        <div className="v2-prompt-examples">
          <span className="v2-examples-label">
            <Sparkles size={12} /> Templates:
          </span>
          <div className="v2-examples-list">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                type="button"
                className="v2-example-chip"
                onClick={() => handleGenerate(ex)}
                disabled={isGenerating}
                title="Click to load prompt"
              >
                {ex.length > 55 ? `${ex.slice(0, 52)}...` : ex}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Controls Row: Language Dropdown + Generate Button ── */}
        <div className="v2-gen-controls-row">
          <div className="v2-gen-lang-select-wrap">
            <label htmlFor="lang-select" className="v2-select-label">Language:</label>
            <select
              id="lang-select"
              className="v2-gen-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isGenerating}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.key} value={lang.key}>
                  {lang.label} ({lang.ext})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="v2-btn-generate"
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="v2-spin" />
                <span>Synthesizing Secure Code...</span>
              </>
            ) : (
              <>
                <Wand2 size={16} />
                <span>Generate Code</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="v2-error-banner" style={{ marginTop: '12px' }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* ── 4. Generated Code Section ── */}
      {hasCode && (
        <section className="v2-gen-card v2-output-card">
          {/* Output Toolbar & Metadata Badges */}
          <div className="v2-output-toolbar">
            <div className="v2-output-tab">
              <FileCode size={14} className="v2-tab-file-icon" />
              <span className="v2-tab-filename">{selectedLang.ext}</span>
              <span className="v2-tab-lang-badge">{selectedLang.label}</span>
            </div>

            {genMeta && (
              <div className="v2-output-meta-badges">
                <span className="v2-meta-badge" title="LLM Engine Model">
                  <Cpu size={11} />
                  <span>{String(genMeta.model).replace('openai/', '').replace('meta-llama/', '')}</span>
                </span>
                <span className="v2-meta-badge" title="Generation Latency">
                  <Clock size={11} />
                  <span>{(genMeta.generationMs / 1000).toFixed(2)}s</span>
                </span>
                <span className="v2-meta-badge" title="Tokens Generated">
                  <Zap size={11} />
                  <span>{genMeta.tokensUsed} tokens</span>
                </span>
                <span className="v2-meta-badge" title="Line Count">
                  <Terminal size={11} />
                  <span>{lineCount} lines</span>
                </span>
              </div>
            )}
          </div>

          {/* Code Viewer with Syntax Highlighting & Line Numbers */}
          <div className="v2-code-canvas-container">
            <div className="v2-code-gutter" aria-hidden="true">
              {lines.map((_, idx) => (
                <div key={idx} className="v2-gutter-line-num">{idx + 1}</div>
              ))}
            </div>

            <div className="v2-code-view-area">
              <pre className="v2-highlight-pre">
                <code
                  className={`hljs language-${selectedLang.hljsLang}`}
                  dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }}
                />
              </pre>
            </div>
          </div>

          {/* ── 5. Action Buttons (Below Generated Code) ── */}
          <div className="v2-output-actions-bar">
            <div className="v2-output-actions-left">
              <span className="v2-output-status-note">
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                Code generated with secure defaults. Recommended: verify with security scan.
              </span>
            </div>

            <div className="v2-output-actions-right">
              {/* Copy Button */}
              <button
                type="button"
                className="v2-action-btn v2-btn-copy"
                onClick={handleCopy}
                title="Copy generated code to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={14} style={{ color: '#10b981' }} />
                    <span style={{ color: '#10b981' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Auto Repair Button */}
              <button
                type="button"
                className="v2-action-btn v2-btn-repair"
                onClick={handleAutoRepair}
                disabled={isRepairing}
                title="Run automatic patch generator"
              >
                {isRepairing ? (
                  <>
                    <Loader2 size={14} className="v2-spin" />
                    <span>Repairing...</span>
                  </>
                ) : (
                  <>
                    <Wrench size={14} />
                    <span>Auto Repair</span>
                  </>
                )}
              </button>

              {/* Analyze This Code Button */}
              <button
                type="button"
                className="v2-action-btn v2-btn-analyze"
                onClick={handleAnalyze}
                title="Send code to Code Scan for full multi-engine audit"
              >
                <Code2 size={15} />
                <span>Analyze This Code</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Repair View Diff (when Auto Repair is triggered) ── */}
      {repairData && (
        <section className="v2-gen-card v2-repair-modal-card">
          <RepairView
            originalCode={generatedCode}
            repairedCode={repairData.repairedCode}
            explanation={repairData.explanation}
            changesCount={repairData.changesCount}
            onAccept={handleAcceptRepair}
            onCancel={() => setRepairData(null)}
          />
        </section>
      )}

      {repairError && (
        <div className="v2-error-banner" style={{ marginTop: '12px' }}>
          <AlertTriangle size={15} />
          <span>{repairError}</span>
        </div>
      )}

      {/* ── Loading Skeleton / Shimmer during generation ── */}
      {isGenerating && (
        <div className="v2-gen-loading-skeleton">
          <div className="v2-skeleton-header">
            <Loader2 size={16} className="v2-spin" style={{ color: '#c084fc' }} />
            <span>AI Code Synthesizer is generating your secure {selectedLang.label} code...</span>
          </div>
          <div className="v2-skeleton-lines">
            <div className="v2-skeleton-bar" style={{ width: '55%' }} />
            <div className="v2-skeleton-bar" style={{ width: '85%' }} />
            <div className="v2-skeleton-bar" style={{ width: '70%' }} />
            <div className="v2-skeleton-bar" style={{ width: '90%' }} />
            <div className="v2-skeleton-bar" style={{ width: '40%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
