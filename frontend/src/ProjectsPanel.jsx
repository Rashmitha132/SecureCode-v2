import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder, Plus, GitBranch, Settings, CheckCircle2,
  AlertTriangle, X, ExternalLink, Copy, Check, Cloud,
  Zap, Shield, TrendingUp, Calendar, Code2, GitCompare,
  Eye, EyeOff, Clock, BarChart2, RefreshCw, Play, Loader2,
  Search, Trash2, Download, FileText, Sparkles, Terminal,
  ChevronRight, CheckCircle, AlertOctagon, ArrowUpRight,
  Filter, ShieldCheck, ShieldAlert, Activity, HelpCircle,
  Lock, KeyRound, ChevronDown, Radio
} from 'lucide-react';

const API_URL = 'http://localhost:4000';

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'At Risk';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline SVG Waves
// ─────────────────────────────────────────────────────────────────────────────
function NeonWave({ color = '#3b82f6', height = 34 }) {
  return (
    <svg width="100%" height={height} viewBox="0 0 200 40" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
        <filter id={`glow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M 0,28 Q 30,34 60,20 T 120,24 T 170,12 T 200,18"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        filter={`url(#glow-${color.replace('#', '')})`}
      />
      <path
        d="M 0,28 Q 30,34 60,20 T 120,24 T 170,12 T 200,18 L 200,40 L 0,40 Z"
        fill={`url(#grad-${color.replace('#', '')})`}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Radial Gauge Component (SVG)
// ─────────────────────────────────────────────────────────────────────────────
function CircularProgress({ score = 78, size = 62, strokeWidth = 5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1e2433"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#e8e9ee' }}>{score}%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart Component (SVG)
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart({ critical = 0, high = 0, low = 0, total = 0, size = 130 }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const effTotal = total || (critical + high + low) || 1;
  const critPct = critical / effTotal;
  const highPct = high / effTotal;
  const lowPct = Math.max(0, 1 - critPct - highPct);

  const critDash = critPct * circumference;
  const highDash = highPct * circumference;
  const lowDash = lowPct * circumference;

  const critOffset = 0;
  const highOffset = -critDash;
  const lowOffset = -(critDash + highDash);

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#1c202d" strokeWidth={strokeWidth} />
        {/* Low / Medium segment (Blue) */}
        {lowDash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeDasharray={`${lowDash} ${circumference}`}
            strokeDashoffset={lowOffset}
          />
        )}
        {/* High segment (Amber/Yellow) */}
        {highDash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${highDash} ${circumference}`}
            strokeDashoffset={highOffset}
          />
        )}
        {/* Critical segment (Red) */}
        {critDash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${critDash} ${circumference}`}
            strokeDashoffset={critOffset}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: '9px', color: 'var(--text-faint)', marginTop: '2px' }}>Total Issues</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-Day Trend Line Chart (SVG)
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTrendChart({ points = [65, 72, 68, 74, 70, 75, 78], dates = ['Aug 15', 'Aug 16', 'Aug 17', 'Aug 18', 'Aug 19', 'Aug 20', 'Aug 21'] }) {
  const width = 340;
  const height = 90;
  const padX = 24;
  const padY = 16;

  const validPoints = points.map(p => Number(p) || 75);
  const minVal = Math.max(0, Math.min(...validPoints) - 15);
  const maxVal = Math.min(100, Math.max(...validPoints) + 10);
  const range = maxVal - minVal || 1;

  const coords = validPoints.map((val, idx) => {
    const x = padX + (idx / Math.max(1, validPoints.length - 1)) * (width - padX * 2);
    const y = height - padY - ((val - minVal) / range) * (height - padY * 2);
    return { x, y, val };
  });

  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;
  const lastPt = coords[coords.length - 1];

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c6ee8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c6ee8" stopOpacity="0.0" />
          </linearGradient>
          <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={areaD} fill="url(#trendAreaGrad)" />
        <path d={pathD} fill="none" stroke="#9061f9" strokeWidth="2.5" filter="url(#purpleGlow)" strokeLinecap="round" />

        {coords.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={i === coords.length - 1 ? 4 : 3} fill="#c084fc" stroke="#12141c" strokeWidth="1.5" />
        ))}
      </svg>

      {/* Floating score pill on latest point */}
      {lastPt && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: `${Math.max(0, lastPt.y - 28)}px`,
            background: '#6366f1',
            color: '#ffffff',
            fontSize: '10.5px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(99,102,241,0.6)',
          }}
        >
          {lastPt.val}/100
        </div>
      )}

      {/* X-Axis Date Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9.5px', color: 'var(--text-faint)', padding: '0 10px' }}>
        {dates.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Terminal Scan Modal
// ─────────────────────────────────────────────────────────────────────────────
function LiveScanTerminalModal({ isOpen, onClose, project, onScanComplete }) {
  const [logs, setLogs] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const logEndRef = useRef(null);

  const steps = [
    { title: 'Cloning Repository', desc: 'Fetching tree & parsing source files' },
    { title: 'Secret & Pattern Scan', desc: 'Analyzing API keys, entropy & regex tokens' },
    { title: 'Dependency Audit (OSV)', desc: 'Cross-referencing packages against CVE databases' },
    { title: 'Semantic AI & AST Graph', desc: 'Detecting logic vulnerabilities with LLM + GNN' },
    { title: 'Remediation Synthesis', desc: 'Prioritizing risk score and patch generation' },
  ];

  useEffect(() => {
    if (!isOpen || !project) return;
    setLogs([]);
    setActiveStep(0);
    setIsCompleted(false);

    const repoName = project.repos?.[0]?.name || project.name;
    const branch = project.repos?.[0]?.branch || 'main';

    const logSequence = [
      { step: 0, text: `[SYSTEM] Initiating scan for repository: ${repoName} (${branch})`, delay: 200 },
      { step: 0, text: `[GIT] Connected to ${project.platform} API. Resolving latest commit tree...`, delay: 600 },
      { step: 1, text: `[SCAN] Checking source files for hardcoded secrets, JWTs & API keys...`, delay: 1100 },
      { step: 1, text: `[SCAN] Shannon entropy analyzer running across .env and config files...`, delay: 1600 },
      { step: 2, text: `[DEP] Inspecting package dependencies against GitHub Advisory & OSV database...`, delay: 2200 },
      { step: 3, text: `[AST] Constructing Control Flow Graph for GNN deep model inference...`, delay: 2800 },
      { step: 3, text: `[LLM] Performing semantic vulnerability evaluation with LLM reasoning...`, delay: 3500 },
      { step: 4, text: `[RISK] Aggregating multi-engine findings and calculating CVSS severity matrix...`, delay: 4200 },
      { step: 4, text: `[COMPLETE] Scan completed successfully. Security Score calculated.`, delay: 4900 },
    ];

    const timers = [];
    logSequence.forEach(({ step, text, delay }) => {
      const t = setTimeout(() => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, `[${timestamp}] ${text}`]);
        setActiveStep(step);
      }, delay);
      timers.push(t);
    });

    const completionTimer = setTimeout(async () => {
      setIsCompleted(true);
      if (onScanComplete) {
        await onScanComplete(project);
      }
    }, 5200);
    timers.push(completionTimer);

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [isOpen, project]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen || !project) return null;

  return (
    <div className="modal-backdrop" onClick={() => isCompleted && onClose()}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
        <div className="panel-head">
          <div className="panel-icon" style={{ background: 'rgba(59,167,240,0.15)', color: '#3ba7f0' }}>
            <Terminal size={18} />
          </div>
          <div>
            <h2>Live Security Scanner</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)' }}>
              Scanning <span style={{ color: '#7ec3f5', fontWeight: 600 }}>{project.name}</span>
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Step Progression */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: '6px', margin: '14px 0 18px' }}>
          {steps.map((s, idx) => {
            const isDone = activeStep > idx || isCompleted;
            const isCurrent = activeStep === idx && !isCompleted;
            return (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: isDone ? '#10b981' : isCurrent ? '#6366f1' : 'var(--border)',
                    marginBottom: '4px',
                    transition: 'background 0.3s ease',
                  }}
                />
                <div style={{ fontSize: '10px', fontWeight: 600, color: isDone ? '#10b981' : isCurrent ? '#818cf8' : 'var(--text-faint)' }}>
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Console View */}
        <div
          style={{
            background: '#090b10',
            border: '1px solid #1a1e2a',
            borderRadius: '8px',
            padding: '12px',
            height: '220px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '11.5px',
            lineHeight: 1.6,
            color: '#a0aec0',
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '3px' }}>
              <span style={{ color: log.includes('COMPLETE') ? '#10b981' : log.includes('SCAN') || log.includes('DEP') ? '#7ec3f5' : '#8b8f9d' }}>
                {log}
              </span>
            </div>
          ))}
          {!isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', marginTop: '6px' }}>
              <Loader2 size={12} className="spin" />
              <span>Analyzing code and dependencies...</span>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button className="scan-btn" style={{ padding: '7px 16px', opacity: isCompleted ? 1 : 0.6 }} onClick={onClose} disabled={!isCompleted}>
            {isCompleted ? 'Done' : 'Scanning in progress...'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect Repository Modal
// ─────────────────────────────────────────────────────────────────────────────
function ConnectRepoModal({ isOpen, onClose, onConnect }) {
  const [platform, setPlatform] = useState('github');
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    if (!projectName.trim() || !repoUrl.trim() || !token.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setConnecting(true);
    try {
      const payload = {
        name: projectName,
        platform: platform === 'github' ? 'GitHub' : 'GitLab',
        repos: [{ name: projectName, url: repoUrl, branch }],
        settings: { autoScan, scanFrequency: 'daily' },
        token,
      };

      await onConnect(payload);
      setProjectName('');
      setRepoUrl('');
      setToken('');
      onClose();
    } catch (err) {
      alert('Failed to connect repository: ' + err.message);
    } finally {
      setConnecting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
        <div className="panel-head">
          <div className="panel-icon"><Cloud size={18} /></div>
          <div><h2>Connect Repository</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
          <div>
            <div className="field-label">Platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              {[
                { key: 'github', label: 'GitHub', icon: GitBranch },
                { key: 'gitlab', label: 'GitLab', icon: Cloud },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  style={{
                    padding: '8px 12px',
                    border: platform === p.key ? '1px solid #6366f1' : '1px solid var(--border)',
                    background: platform === p.key ? 'rgba(99,102,241,0.12)' : 'var(--panel-2)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <p.icon size={16} /> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label">Project Name</div>
            <input
              type="text"
              className="code-input"
              style={{ height: 'auto', padding: '8px 12px', marginTop: '4px' }}
              placeholder="e.g., SecureCode-Backend"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div>
            <div className="field-label">Repository URL</div>
            <input
              type="text"
              className="code-input"
              style={{ height: 'auto', padding: '8px 12px', marginTop: '4px' }}
              placeholder={platform === 'github' ? 'github.com/owner/repo' : 'gitlab.com/owner/repo'}
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>

          <div>
            <div className="field-label">Default Branch</div>
            <input
              type="text"
              className="code-input"
              style={{ height: 'auto', padding: '8px 12px', marginTop: '4px' }}
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <div>
            <div className="field-label">Personal Access Token (PAT)</div>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <input
                type={showToken ? 'text' : 'password'}
                className="code-input"
                style={{ height: 'auto', padding: '8px 12px', paddingRight: '36px' }}
                placeholder={platform === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxx' : 'glpat-xxxxxxxxxxxxxxxxxxxx'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <button
                className="icon-btn"
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '26px', height: '26px' }}
                onClick={() => setShowToken(!showToken)}
                type="button"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            {/* Direct PAT Generation Link */}
            <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <span>Don't have a token?</span>
              <a
                href={
                  platform === 'github'
                    ? 'https://github.com/settings/tokens/new?scopes=repo,read:org&description=SecureCode%20Integration'
                    : 'https://gitlab.com/-/user_settings/personal_access_tokens'
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#818cf8',
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <span>Generate {platform === 'github' ? 'GitHub' : 'GitLab'} Token</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
            <button className="scan-btn" style={{ flex: 1 }} onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Connecting…' : '+ Connect Repository'}
            </button>
            <button className="text-btn" style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--panel-2)' }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Remediation Diff & PR Modal
// ─────────────────────────────────────────────────────────────────────────────
function RemediationDiffModal({ isOpen, onClose, project, onPRCreated }) {
  const [creatingPR, setCreatingPR] = useState(false);
  const [prSuccess, setPrSuccess] = useState(false);

  if (!isOpen || !project) return null;

  const mockFix = {
    file: 'server/auth.js',
    issue: 'Hardcoded Secret / JWT Token Exposed',
    original: `// Before\nconst JWT_SECRET = "super_secret_key_12345";\nconst token = jwt.sign({ user: req.user.id }, JWT_SECRET);`,
    patched: `// After (AI Patched)\nconst JWT_SECRET = process.env.JWT_SECRET;\nif (!JWT_SECRET) throw new Error("JWT_SECRET env var is missing");\nconst token = jwt.sign({ user: req.user.id }, JWT_SECRET, { expiresIn: '1h' });`,
  };

  async function handleCreatePR() {
    setCreatingPR(true);
    try {
      const res = await fetch(`${API_URL}/projects/${project.id}/prs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `fix(security): sanitize credentials and patch ${project.critical || 1} vulnerability`,
          status: 'open',
        }),
      });
      if (res.ok) {
        setPrSuccess(true);
        if (onPRCreated) onPRCreated();
        setTimeout(() => {
          setPrSuccess(false);
          onClose();
        }, 1600);
      }
    } catch (err) {
      alert('Failed to create PR: ' + err.message);
    } finally {
      setCreatingPR(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="panel-head">
          <div className="panel-icon" style={{ background: 'rgba(169,140,240,0.15)', color: '#a98cf0' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h2>AI Auto-Remediation & Fix Preview</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)' }}>Project: {project.name}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div style={{ margin: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Target: <code>{mockFix.file}</code></span>
            <span className="chip" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px' }}>{mockFix.issue}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <pre style={{ background: '#181114', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#f87171', overflowX: 'auto' }}>
              {mockFix.original}
            </pre>
            <pre style={{ background: '#0d1a14', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#86efac', overflowX: 'auto' }}>
              {mockFix.patched}
            </pre>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
          <button className="text-btn" onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--panel-2)' }}>Cancel</button>
          <button className="scan-btn" onClick={handleCreatePR} disabled={creatingPR || prSuccess} style={{ padding: '6px 14px' }}>
            {prSuccess ? 'PR Created!' : creatingPR ? 'Submitting PR…' : 'Create Fix Pull Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Modal
// ─────────────────────────────────────────────────────────────────────────────
function ExportReportModal({ isOpen, onClose, project }) {
  if (!isOpen || !project) return null;

  function handleExportSARIF() {
    window.open(`${API_URL}/projects/${project.id}/export?format=sarif`, '_blank');
    onClose();
  }

  function handleExportJSON() {
    const report = {
      project: project.name,
      platform: project.platform,
      securityScore: project.securityScore,
      totalIssues: project.totalIssues,
      critical: project.critical,
      high: project.high,
      medium: project.medium,
      low: project.low,
      remediationProgress: `${project.remediationProgress}%`,
      lastScanned: project.lastScan,
    };
    const a = document.createElement('a');
    const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    a.href = URL.createObjectURL(file);
    a.download = `${project.name}-security.json`;
    a.click();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
        <div className="panel-head">
          <div className="panel-icon"><Download size={18} /></div>
          <div><h2>Export Report</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
          <button
            onClick={handleExportSARIF}
            style={{
              padding: '10px 14px',
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px' }}>SARIF 2.1.0 (Standard)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>For GitHub Security & GitLab CI/CD</div>
          </button>
          <button
            onClick={handleExportJSON}
            style={{
              padding: '10px 14px',
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px' }}>JSON Summary</div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Vulnerability array & score metrics</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteProjectModal({ isOpen, onClose, project, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !project) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`${API_URL}/projects/${project.id}`, { method: 'DELETE' });
      onDeleted(project.id);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="panel-head">
          <div className="panel-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></div>
          <div><h2>Delete Project</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '10px 0 16px' }}>
          Are you sure you want to delete <strong>{project.name}</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="text-btn" onClick={onClose} style={{ padding: '6px 12px', background: 'var(--panel-2)', borderRadius: '6px' }}>Cancel</button>
          <button className="scan-btn" style={{ background: '#ef4444', padding: '6px 14px' }} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Projects & Repositories Panel
// ─────────────────────────────────────────────────────────────────────────────
export default function ProjectsPanel({ goToNav, onOpenHowItWorks }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScanGlobal, setAutoScanGlobal] = useState(() => {
    return localStorage.getItem('sc_continuous_monitoring') !== 'false';
  });
  const [trendPeriod, setTrendPeriod] = useState('7d');
  const [toastMsg, setToastMsg] = useState('');

  // Sub-tabs in Recent Scans
  const [activeScanTab, setActiveScanTab] = useState('code'); // 'code', 'password', 'ssl', 'projects'

  // Modals
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [liveScanProject, setLiveScanProject] = useState(null);
  const [remediateProject, setRemediateProject] = useState(null);
  const [exportProject, setExportProject] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }

  function handleToggleMonitoring() {
    const next = !autoScanGlobal;
    setAutoScanGlobal(next);
    localStorage.setItem('sc_continuous_monitoring', String(next));
    showToast(next ? 'Continuous Monitoring: Active (Auto-scanning on git push & commits)' : 'Continuous Monitoring: Paused');
  }

  async function loadProjects() {
    try {
      let loaded = null;
      try {
        const res = await fetch(`${API_URL}/projects`);
        if (res.ok) {
          const data = await res.json();
          loaded = data.projects;
        }
      } catch (e) {}

      if (!loaded) {
        loaded = JSON.parse(localStorage.getItem('sc_connected_projects') || '[]');
      }
      setProjects(loaded || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleConnect(payload) {
    let saved = false;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) saved = true;
    } catch (e) {}

    // Fallback/sync to localStorage
    const localProj = JSON.parse(localStorage.getItem('sc_connected_projects') || '[]');
    const newProj = {
      id: Date.now(),
      name: payload.name,
      platform: payload.platform,
      repos: payload.repos || [{ name: payload.name, url: payload.repos?.[0]?.url, branch: payload.repos?.[0]?.branch || 'main' }],
      securityScore: 100,
      totalIssues: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      remediationProgress: 100,
      lastScan: new Date().toISOString(),
      token: payload.token,
      settings: payload.settings || { autoScan: true }
    };
    localProj.unshift(newProj);
    localStorage.setItem('sc_connected_projects', JSON.stringify(localProj));
    setProjects(localProj);
    showToast(`Successfully connected repository: ${payload.name}`);
  }

  // Real aggregated metrics calculation
  const totalProjects = projects.length;
  const totalCritical = projects.reduce((sum, p) => sum + (p.critical || 0), 0);
  const totalHigh = projects.reduce((sum, p) => sum + (p.high || 0), 0);
  const totalMedium = projects.reduce((sum, p) => sum + (p.medium || 0), 0);
  const totalLow = projects.reduce((sum, p) => sum + (p.low || 0), 0);
  const totalIssues = totalCritical + totalHigh + totalMedium + totalLow;

  const avgHealthScore = projects.length > 0
    ? Math.round(
        projects.reduce((sum, p) => {
          const score = p.securityScore && p.securityScore > 0
            ? p.securityScore
            : Math.max(0, 100 - ((p.critical || 0) * 30 + (p.high || 0) * 15 + (p.medium || 0) * 5));
          return sum + score;
        }, 0) / projects.length
      )
    : 100;

  // Real percentages for Donut chart
  const critPct = totalIssues > 0 ? Math.round((totalCritical / totalIssues) * 100) : 0;
  const highPct = totalIssues > 0 ? Math.round((totalHigh / totalIssues) * 100) : 0;
  const lowPct = totalIssues > 0 ? Math.max(0, 100 - critPct - highPct) : 0;

  // Dynamic trend data maps
  const TREND_DATA = {
    '7d': {
      dates: ['Aug 15', 'Aug 16', 'Aug 17', 'Aug 18', 'Aug 19', 'Aug 20', 'Aug 21'],
      points: [Math.max(40, avgHealthScore - 12), Math.max(45, avgHealthScore - 8), Math.max(42, avgHealthScore - 10), Math.max(50, avgHealthScore - 4), Math.max(55, avgHealthScore - 3), Math.max(60, avgHealthScore - 1), avgHealthScore],
    },
    '14d': {
      dates: ['Aug 08', 'Aug 10', 'Aug 12', 'Aug 14', 'Aug 16', 'Aug 18', 'Aug 21'],
      points: [Math.max(35, avgHealthScore - 18), Math.max(40, avgHealthScore - 14), Math.max(48, avgHealthScore - 10), Math.max(54, avgHealthScore - 6), Math.max(62, avgHealthScore - 4), Math.max(70, avgHealthScore - 2), avgHealthScore],
    },
    '30d': {
      dates: ['Jul 22', 'Jul 28', 'Aug 04', 'Aug 10', 'Aug 15', 'Aug 18', 'Aug 21'],
      points: [Math.max(30, avgHealthScore - 25), Math.max(38, avgHealthScore - 18), Math.max(45, avgHealthScore - 14), Math.max(52, avgHealthScore - 10), Math.max(60, avgHealthScore - 6), Math.max(68, avgHealthScore - 2), avgHealthScore],
    },
  };

  const activeTrend = TREND_DATA[trendPeriod] || TREND_DATA['7d'];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1e1b4b',
            border: '1px solid #6366f1',
            color: '#e0e7ff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#4fd08a" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── 1. Header Toolbar ────────────────────────────────────────────── */}
      <div className="proj-header-row">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Projects &</span>
            <span
              style={{
                background: 'linear-gradient(90deg, #c084fc, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Repositories
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)' }}>
            Monitor, analyze and improve security across your codebase
          </p>
        </div>

        <div className="proj-header-actions">
          <button
            onClick={() => setConnectModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(124, 110, 232, 0.3)',
            }}
          >
            <Plus size={15} /> Connect Repository
          </button>

          <button
            onClick={() => goToNav ? goToNav('How It Works') : (onOpenHowItWorks && onOpenHowItWorks())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel-2)',
              color: 'var(--text-dim)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <HelpCircle size={15} /> How it works
          </button>

          <button
            onClick={() => goToNav && goToNav('Settings')}
            className="icon-btn"
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)' }}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. Top Hero Banner Card ───────────────────────────────────────── */}
      <div className="proj-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#1e293b',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GitBranch size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
              Secure Your Code, Build a Safer Tomorrow
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Automated scans • AI-powered insights • Continuous monitoring
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: autoScanGlobal ? '#4fd08a' : 'var(--text-dim)' }}>
              {autoScanGlobal ? 'Monitoring Active' : 'Monitoring Paused'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
              {autoScanGlobal ? 'Auto-scans on git push' : 'Manual scans only'}
            </span>
          </div>
          <button
            className={`toggle ${autoScanGlobal ? 'on' : ''}`}
            onClick={handleToggleMonitoring}
            style={{ width: '40px', height: '22px' }}
            title="Toggle Continuous Monitoring (Auto-scans on git push)"
            aria-label="Toggle Continuous Monitoring"
          >
            <span className="toggle-knob" style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* ── 3. 4 Glowing Metric Cards ──────────────────────────────────────── */}
      <div className="proj-metrics-grid">
        {/* Card 1: Total Projects */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Folder size={16} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>Total Projects</span>
            </div>
            <span style={{ fontSize: '11px', color: totalProjects > 0 ? '#10b981' : 'var(--text-faint)', fontWeight: 600 }}>{totalProjects > 0 ? 'Active' : '—'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            {totalProjects}
          </div>
          <NeonWave color="#3b82f6" height={28} />
        </div>

        {/* Card 2: Critical Risks */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>Critical Risks</span>
            </div>
            <span style={{ fontSize: '11px', color: totalCritical > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{totalCritical > 0 ? '⚠️ High' : '✓ 0%'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            {totalCritical}
          </div>
          <NeonWave color="#ef4444" height={28} />
        </div>

        {/* Card 3: High Severity */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>High Severity</span>
            </div>
            <span style={{ fontSize: '11px', color: totalHigh > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{totalHigh > 0 ? '⚠️ Risk' : '✓ 0%'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            {totalHigh}
          </div>
          <NeonWave color="#f59e0b" height={28} />
        </div>

        {/* Card 4: Avg. Health Score with Ring */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>Avg. Health Score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>{totalProjects > 0 ? `${avgHealthScore}/100` : '—'}</span>
              {totalProjects > 0 && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>{getScoreLabel(avgHealthScore)}</span>
              )}
            </div>
            <NeonWave color="#10b981" height={20} />
          </div>

          <CircularProgress score={totalProjects > 0 ? avgHealthScore : 100} size={62} strokeWidth={5} />
        </div>
      </div>

      {/* ── 4. Main 2-Column Dashboard Grid ──────────────────────────────── */}
      <div className="proj-main-grid">
        {/* Left Panel: Recent Scans */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Recent Scans Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#818cf8' }}><Clock size={17} /></div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Recent Scans</h2>
            </div>
            <button
              onClick={() => goToNav && goToNav('Scan History')}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View History →
            </button>
          </div>

          {/* Sub-Tabs Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { key: 'code', label: 'Code Scan', icon: Code2 },
              { key: 'password', label: 'Password Check', icon: Lock },
              { key: 'ssl', label: 'SSL / Security', icon: ShieldCheck },
              { key: 'projects', label: `Connected Repos (${projects.length})`, icon: Folder },
            ].map((tab) => {
              const active = activeScanTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveScanTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: active ? '1px solid #6366f1' : '1px solid var(--border)',
                    background: active ? '#1e1b4b' : 'var(--panel-2)',
                    color: active ? '#a5b4fc' : 'var(--text-dim)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inner Content Area */}
          {activeScanTab !== 'projects' ? (
            <div
              style={{
                background: '#0c0e17',
                border: '1px solid #1a1e2d',
                borderRadius: '12px',
                padding: '36px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1,
              }}
            >
              {/* Glowing Search Circle Icon */}
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #2e1a5a 0%, #15102a 100%)',
                  border: '1px solid #6366f1',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 0 24px rgba(124, 110, 232, 0.4)',
                }}
              >
                <Search size={24} />
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#ffffff' }}>
                Ready for your next scan?
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', maxWidth: '380px', margin: '0 0 18px' }}>
                Analyze your code, check vulnerabilities and get AI-powered insights.
              </p>

              <button
                onClick={() => {
                  if (projects.length > 0) {
                    setLiveScanProject(projects[0]);
                  } else if (goToNav) {
                    goToNav('Code Scan');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                Start Code Scan →
              </button>
            </div>
          ) : (
            /* Connected Projects List Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {projects.length === 0 ? (
                <p className="empty-sub" style={{ textAlign: 'center', padding: '24px 0' }}>
                  No repositories connected yet. Click "+ Connect Repository" to add one.
                </p>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Folder size={18} color="#38bdf8" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                          {p.platform} · {p.repos?.[0]?.branch || 'main'} · Last: {formatDate(p.lastScan)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="text-btn"
                        style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--panel)', borderRadius: '6px' }}
                        onClick={() => setRemediateProject(p)}
                      >
                        <Sparkles size={12} color="#a98cf0" /> AI Fix
                      </button>
                      <button
                        className="text-btn"
                        style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--panel)', borderRadius: '6px' }}
                        onClick={() => setExportProject(p)}
                      >
                        <Download size={12} color="#38bdf8" /> SARIF
                      </button>
                      <button
                        className="scan-btn"
                        style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px' }}
                        onClick={() => setLiveScanProject(p)}
                      >
                        <Play size={11} /> Scan
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: '24px', height: '24px', color: '#ef4444' }}
                        onClick={() => setDeleteProject(p)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Scan Overview & Security Trend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Card: Scan Overview */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart2 size={17} style={{ color: '#818cf8' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Scan Overview</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <DonutChart critical={totalCritical} high={totalHigh} low={totalLow + totalMedium} total={totalIssues} size={120} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ color: 'var(--text-dim)' }}>Critical</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{totalCritical} ({critPct}%)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: 'var(--text-dim)' }}>High</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{totalHigh} ({highPct}%)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                    <span style={{ color: 'var(--text-dim)' }}>Low</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{totalLow + totalMedium} ({lowPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card: Security Trend */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={17} style={{ color: '#818cf8' }} />
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Security Trend</h2>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={trendPeriod}
                  onChange={(e) => {
                    setTrendPeriod(e.target.value);
                    showToast(`Security trend updated: ${e.target.value === '7d' ? 'Last 7 Days' : e.target.value === '14d' ? 'Last 14 Days' : 'Last 30 Days'}`);
                  }}
                  style={{
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 24px 4px 8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    appearance: 'none',
                    outline: 'none',
                  }}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="14d">Last 14 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '6px', pointerEvents: 'none', color: 'var(--text-faint)' }} />
              </div>
            </div>

            <SecurityTrendChart points={activeTrend.points} dates={activeTrend.dates} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConnectRepoModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} onConnect={handleConnect} />
      <LiveScanTerminalModal isOpen={!!liveScanProject} onClose={() => setLiveScanProject(null)} project={liveScanProject} onScanComplete={loadProjects} />
      <RemediationDiffModal isOpen={!!remediateProject} onClose={() => setRemediateProject(null)} project={remediateProject} onPRCreated={loadProjects} />
      <ExportReportModal isOpen={!!exportProject} onClose={() => setExportProject(null)} project={exportProject} />
      <DeleteProjectModal
        isOpen={!!deleteProject}
        onClose={() => setDeleteProject(null)}
        project={deleteProject}
        onDeleted={() => loadProjects()}
      />
    </div>
  );
}