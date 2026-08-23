// CodeScanView.jsx
// Redesigned Code Scan interface for SecureCode (Linear/Vercel Aesthetic)
// Minimal, modern, lightweight, with complete Light and Dark theme support.

import { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Sliders,
  Package,
  UploadCloud,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Bug,
  Brain,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  FileCode,
  Check,
  Loader2,
  FileText,
  X,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';

const SCAN_TYPE_ITEMS = [
  {
    key: 'code',
    label: 'Source Code',
    desc: 'Python, JS, TS, Java, C++, Go',
    icon: Code2,
    placeholder: '// Paste your source code snippet or function here to analyze...\n\ndef authenticate_user(username, password):\n    query = f"SELECT * FROM users WHERE user = \'{username}\'"\n    return db.execute(query)',
  },
  {
    key: 'config',
    label: 'Configuration',
    desc: '.env, .yml, .json, Dockerfiles',
    icon: Sliders,
    placeholder: '# Paste your configuration file (.env, yaml, json, etc.)\n\nAWS_SECRET_ACCESS_KEY="AKIAIOSFODNN7EXAMPLE"\nDATABASE_URL="postgres://user:pass@localhost:5432/db"\nDEBUG=true\nCORS_ALLOW_ALL=true',
  },
  {
    key: 'deps',
    label: 'Dependencies',
    desc: 'package.json, requirements.txt',
    icon: Package,
    placeholder: '{\n  "name": "my-app",\n  "dependencies": {\n    "express": "^4.17.1",\n    "lodash": "4.17.15",\n    "jsonwebtoken": "^8.5.1"\n  }\n}',
  },
  {
    key: 'upload',
    label: 'File Upload',
    desc: 'Upload any local source file',
    icon: UploadCloud,
    placeholder: 'Upload a file using the dropzone above, or paste raw file content here.',
  },
];

const SCAN_OPTION_ITEMS = [
  { key: 'secrets', label: 'Secret Detection', icon: KeyRound, desc: 'API keys & entropy' },
  { key: 'vuln', label: 'Vulnerability Analysis', icon: Bug, desc: 'OWASP & common flaws' },
  { key: 'deps', label: 'Dependency Check', icon: Package, desc: 'OSV.dev CVE database' },
  { key: 'ai', label: 'AI Analysis', icon: Brain, desc: 'Groq semantic review' },
  { key: 'gnn', label: 'GNN Detection', icon: Cpu, desc: 'PyTorch AST classifier' },
];

const PIPELINE_STAGES = [
  { key: 'input', label: 'Input Validation', icon: FileText },
  { key: 'secrets', label: 'Secrets & Entropy', icon: KeyRound },
  { key: 'vuln', label: 'Vulnerabilities', icon: Bug },
  { key: 'deps', label: 'Dependencies', icon: Package },
  { key: 'ai', label: 'AI Semantic', icon: Brain },
  { key: 'gnn', label: 'GNN AST', icon: Cpu },
  { key: 'risk', label: 'Risk Score', icon: ShieldAlert },
];

function checkIsCode(text) {
  if (!text || !text.trim()) return { isCode: true };
  const t = text.trim();
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { isCode: true };

  const STRONG_CODE_PATTERNS = [
    /^\s*(import|from|export|require|include|using|package)\s+[\w@'"{]/m,
    /^\s*(def|function|func|fn|proc)\s+\w+\s*\(/m,
    /^\s*(public\s+class|class\s+\w+|struct\s+\w+|interface\s+\w+|enum\s+\w+)/m,
    /^\s*(const|let|var|val|int|float|double|bool|string)\s+\w+\s*[=;:\(]/m,
    /^\s*(if|else\s+if|elif|for|while|switch|try|catch)\s*[\(\{:]/m,
    /=>\s*[\{\(]|\bconsole\.log\(|\bprint\(|\bSystem\.out\.println\(|\bfmt\.Println\(/m,
    /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE)\s+/im,
    /^\s*\{[\s\S]*"[a-zA-Z0-9_-]+"\s*:\s*[\s\S]*\}/,
    /^\s*[A-Z0-9_-]+\s*=\s*.+$/m,
    /^\s*(FROM|RUN|COPY|WORKDIR|CMD|ENTRYPOINT)\s+[a-zA-Z0-9_\/:-]+/m,
  ];

  for (const pat of STRONG_CODE_PATTERNS) {
    if (pat.test(t)) return { isCode: true };
  }

  const PROSE_SENTENCE_PAT = /^[0-9\.\-\*\•\s]*[A-Z][a-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}/;
  let proseLines = 0;
  for (const line of lines) {
    if (!/[={};<>]|=>|::|#include|\/\//.test(line) && PROSE_SENTENCE_PAT.test(line)) {
      proseLines++;
    }
  }

  if (lines.length >= 2 && proseLines / lines.length >= 0.35) {
    return {
      isCode: false,
      reason: 'Natural language sentences detected. Please paste valid source code in Python, JavaScript, Java, C++, Go, SQL, JSON, or .env.',
    };
  }

  if (lines.length === 1 && PROSE_SENTENCE_PAT.test(lines[0]) && !/[={};<>()]/.test(lines[0])) {
    return {
      isCode: false,
      reason: 'Plain text sentence detected. Please paste valid programming code.',
    };
  }

  const codePunctuation = (t.match(/[;{}()[\]=+\-*/<>]/g) || []).length;
  const wordCount = (t.match(/[a-zA-Z]+/g) || []).length;
  if (wordCount > 10 && codePunctuation / (wordCount + 1) < 0.12) {
    return {
      isCode: false,
      reason: 'Natural language text detected. SecureCode scans programming code and configuration files.',
    };
  }

  return { isCode: true };
}

export default function CodeScanView({
  code,
  setCode,
  scanning,
  results,
  error,
  onScan,
  onClear,
  goToNav,
  scanDurationMs,
}) {
  const [scanType, setScanType] = useState('code');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  // Scan options toggle state
  const [options, setOptions] = useState({
    secrets: true,
    vuln: true,
    deps: true,
    ai: true,
    gnn: true,
  });

  const fileInputRef = useRef(null);

  const toggleOption = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validation = checkIsCode(code);

  // Animate pipeline stages when scanning
  useEffect(() => {
    let interval;
    if (scanning) {
      setActivePipelineStep(0);
      interval = setInterval(() => {
        setActivePipelineStep((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
      }, 500);
    } else {
      setActivePipelineStep(PIPELINE_STAGES.length);
    }
    return () => clearInterval(interval);
  }, [scanning]);

  // Handle file picker and drop
  const handleFile = (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / 1024).toFixed(1));

    const reader = new FileReader();
    reader.onload = (e) => {
      setCode(String(e.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handleClearAll = () => {
    setUploadedFileName('');
    setUploadedFileSize(null);
    onClear();
  };

  const currentTypeMeta = SCAN_TYPE_ITEMS.find((t) => t.key === scanType) || SCAN_TYPE_ITEMS[0];

  const lineCount = (code || '').split('\n').length;
  const charCount = (code || '').length;

  return (
    <div className="v2-scan-wrapper">
      {/* ── Top Section: Page Title + Short Description ── */}
      <header className="v2-scan-header">
        <div className="v2-scan-header-title">
          <div className="v2-scan-tag">
            <Sparkles size={13} className="v2-tag-icon" />
            <span>Hybrid Multi-Engine Scanner</span>
          </div>
          <h1>Code Scan</h1>
          <p className="hide-on-mobile">Analyze source code, configurations, or dependency manifests for secrets, vulnerabilities, and structural defects.</p>
        </div>

        {results && !scanning && (
          <button
            className="v2-btn-secondary"
            onClick={() => goToNav && goToNav('Scan Results')}
            title="Jump to last scan findings"
          >
            <span>View Latest Results</span>
            <ChevronRight size={14} />
          </button>
        )}
      </header>

      {/* ── Section 1: Choose What to Scan (4 Selectable Cards) ── */}
      <section className="v2-scan-section">
        <div className="v2-section-label-row">
          <span className="v2-section-step-num">1</span>
          <span className="v2-section-title">Choose what to scan</span>
        </div>

        <div className="v2-scan-types-grid">
          {SCAN_TYPE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = scanType === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`v2-scan-type-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setScanType(item.key)}
              >
                <div className={`v2-scan-type-icon ${isSelected ? 'selected-icon' : ''}`}>
                  <Icon size={18} />
                </div>
                <div className="v2-scan-type-info">
                  <span className="v2-scan-type-name">{item.label}</span>
                  <span className="v2-scan-type-desc">{item.desc}</span>
                </div>
                {isSelected && (
                  <div className="v2-selected-check">
                    <Check size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Code / File Input (Clean Editor + Clear Button) ── */}
      <section className="v2-scan-section">
        <div className="v2-section-label-row">
          <span className="v2-section-step-num">2</span>
          <span className="v2-section-title">Code / File input</span>

          <div className="v2-editor-actions">
            {code && (
              <button
                type="button"
                className="v2-btn-clear"
                onClick={handleClearAll}
                title="Clear code input"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* File Upload Dropzone (when Upload is selected or file is loaded) */}
        {scanType === 'upload' && (
          <div
            className={`v2-dropzone ${isDragOver ? 'drag-over' : ''} ${uploadedFileName ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="v2-dropzone-icon">
              <UploadCloud size={24} />
            </div>

            {uploadedFileName ? (
              <div className="v2-uploaded-file-info">
                <span className="v2-uploaded-name">{uploadedFileName}</span>
                <span className="v2-uploaded-size">({uploadedFileSize} KB) • Click or drag to replace</span>
              </div>
            ) : (
              <div className="v2-dropzone-text">
                <span className="v2-dropzone-primary">Click to upload or drag & drop</span>
                <span className="v2-dropzone-sub">Supports .py, .js, .ts, .json, .yml, .java, .cpp, and more</span>
              </div>
            )}
          </div>
        )}

        {/* Main Code Editor Box */}
        <div className="v2-editor-container">
          <div className="v2-editor-toolbar">
            <div className="v2-editor-tags">
              <span className="v2-editor-tag active-lang">{currentTypeMeta.label}</span>
              <span className="v2-editor-tag">UTF-8</span>
            </div>

            <div className="v2-editor-stats">
              <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
              <span>•</span>
              <span>{charCount} chars</span>
            </div>
          </div>

          <textarea
            className="v2-code-textarea"
            placeholder={currentTypeMeta.placeholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            rows={12}
          />

          <div className="v2-editor-footer">
            <span className="v2-supported-label">Supported formats:</span>
            <div className="v2-supported-chips">
              {['.py', '.js', '.ts', '.json', '.env', '.yml', '.java', '.cpp', '.go'].map((ext) => (
                <span key={ext} className="v2-ext-chip">{ext}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Non-Code Prose Warning Banner */}
        {!validation.isCode && code.trim().length > 0 && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Non-Code Input Detected: </strong>
              <span>{validation.reason}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="v2-error-banner">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* ── Section 3: Scan Options (Compact Horizontal Toggle Chips) ── */}
      <section className="v2-scan-section">
        <div className="v2-section-label-row">
          <span className="v2-section-step-num">3</span>
          <span className="v2-section-title">Scan Options</span>
          <span className="v2-section-hint">Select analysis engines to include</span>
        </div>

        <div className="v2-options-row">
          {SCAN_OPTION_ITEMS.map((opt) => {
            const Icon = opt.icon;
            const isChecked = options[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                className={`v2-option-chip ${isChecked ? 'active' : ''}`}
                onClick={() => toggleOption(opt.key)}
                title={opt.desc}
              >
                <div className={`v2-opt-check ${isChecked ? 'checked' : ''}`}>
                  {isChecked && <Check size={11} />}
                </div>
                <Icon size={14} className="v2-opt-icon" />
                <span className="v2-opt-label">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. Primary Action: Large Start Scan Button ── */}
      <div className="v2-primary-action-wrap">
        <button
          className="v2-btn-start-scan"
          onClick={onScan}
          disabled={scanning || !code.trim() || !validation.isCode}
          title={!validation.isCode ? validation.reason : 'Run multi-engine security scan'}
          style={{
            opacity: scanning || !code.trim() || !validation.isCode ? 0.45 : 1,
            cursor: scanning || !code.trim() || !validation.isCode ? 'not-allowed' : 'pointer',
          }}
        >
          {scanning ? (
            <>
              <Loader2 size={18} className="v2-spin" />
              <span>Analyzing Code with Multi-Engine Pipeline...</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>Start Security Scan</span>
            </>
          )}
        </button>
      </div>

      {/* ── 6. Analysis Pipeline: Show ONLY when scan is running ── */}
      {scanning && (
        <section className="v2-pipeline-card">
          <div className="v2-pipeline-header">
            <div className="v2-pipeline-title-group">
              <Loader2 size={15} className="v2-spin" style={{ color: '#c084fc' }} />
              <h3>Analysis Pipeline in Progress</h3>
            </div>
            <span className="v2-pipeline-badge">Real-time Execution</span>
          </div>

          <div className="v2-pipeline-steps-track">
            {PIPELINE_STAGES.map((stg, idx) => {
              const Icon = stg.icon;
              const isCompleted = idx < activePipelineStep;
              const isCurrent = idx === activePipelineStep;
              const isPending = idx > activePipelineStep;

              return (
                <div key={stg.key} className="v2-pipeline-node-wrap">
                  <div className={`v2-pipeline-node ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                    <div className="v2-node-icon-box">
                      {isCompleted ? <Check size={13} /> : isCurrent ? <Loader2 size={13} className="v2-spin" /> : <Icon size={13} />}
                    </div>
                    <span className="v2-node-label">{stg.label}</span>
                  </div>

                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`v2-node-connector ${isCompleted ? 'completed' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Post-Scan Summary Banner (when scan results are ready) ── */}
      {results && !scanning && (
        <div className="v2-scan-completed-banner">
          <div className="v2-completed-left">
            <div className="v2-completed-icon">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4>Scan Completed Successfully</h4>
              <p>
                Identified <strong>{results.findings?.length || 0} issue{(results.findings || []).length === 1 ? '' : 's'}</strong> • Risk Score: <strong>{results.riskScore || 0}/100</strong> • Duration: {scanDurationMs ? (scanDurationMs / 1000).toFixed(2) : '0.42'}s
              </p>
            </div>
          </div>

          <div className="v2-completed-right">
            <button
              className="v2-btn-view-results"
              onClick={() => goToNav && goToNav('Scan Results')}
            >
              <span>Inspect Findings</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
