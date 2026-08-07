import { useState, useEffect } from 'react';
import {
  ShieldCheck, HelpCircle, Sun, Moon, Code2, Trash2, FileText, Zap,
  Search, BarChart2, Lock, Clock, Settings, Info, CheckCircle2,
  AlertTriangle, ChevronRight, ChevronDown, Menu, X,
  ShieldAlert, KeyRound, Sliders, Package, Brain,
  Home, GitCompare, Folder, Bookmark, TrendingUp, Gauge, CalendarDays,
  UploadCloud, Check, Bug, Wrench, Gauge as GaugeIcon,
} from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:4000';

// Sidebar nav, grouped to match the full feature list. "How It Works" reuses
// the existing topbar modal instead of a page (special: 'modal'). Everything
// else under Analysis / Results & Reports reads from the same `results` /
// `history` state Code Scan already populates — no duplicate scanning.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: Home }],
  },
  {
    label: 'Scan',
    items: [{ label: 'Code Scan', icon: Code2 }],
  },
  {
    label: 'Results & Reports',
    items: [
      { label: 'Scan Results', icon: FileText },
      { label: 'Scan History', icon: Clock },
      { label: 'Compare Scans', icon: GitCompare },
      { label: 'Reports', icon: BarChart2 },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Security Coverage', icon: ShieldAlert },
      { label: 'Secrets Detection', icon: KeyRound },
      { label: 'Configuration Check', icon: Sliders },
      { label: 'Dependency Check', icon: Package },
      { label: 'AI Prioritization', icon: Brain },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Projects', icon: Folder },
      { label: 'Saved Snippets', icon: Bookmark },
    ],
  },
  {
    label: 'Settings & Help',
    items: [
      { label: 'Settings', icon: Settings },
      { label: 'How It Works', icon: HelpCircle, special: 'modal' },
      { label: 'About', icon: Info },
    ],
  },
];

const FEATURES = [
  { icon: Zap, color: 'amber', title: 'Fast scanning', desc: 'Quick and accurate results' },
  { icon: ShieldCheck, color: 'green', title: 'Secure & private', desc: 'Your code stays on your device' },
  { icon: Search, color: 'blue', title: 'Smart detection', desc: 'Detects keys, tokens & secrets' },
  { icon: BarChart2, color: 'teal', title: 'Detailed reports', desc: 'Easy to understand findings' },
];

function severityClass(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'sev-critical';
  if (s === 'high') return 'sev-high';
  if (s === 'medium') return 'sev-medium';
  return 'sev-low';
}

// Inline fallback color for the Critical badge/chip in case App.css doesn't
// yet define .sev-critical — safe to remove once you add that CSS class.
const CRITICAL_FALLBACK = { background: 'rgba(255,0,60,0.15)', color: '#ff3c5f', border: '1px solid rgba(255,0,60,0.4)' };

// Maps a finding's `type` string to one of the 9 requirement categories.
// Used to build Security Coverage / Secrets Detection / Configuration Check
// / AI Prioritization / Reports from the same results Code Scan already
// produces, instead of re-scanning.
function categoryOf(f) {
  const t = (f.type || '').toLowerCase();
  if (t.includes('sql') || t.includes('injection') || t.includes('xss')) return 'injection';
  if (t.includes('key') || t.includes('secret') || t.includes('password') || t.includes('token') || t.includes('credential')) return 'secrets';
  if (t.includes('auth')) return 'auth';
  if (t.includes('access') || t.includes('permission') || t.includes('rbac')) return 'access';
  if (t.includes('config') || t.includes('cors') || t.includes('debug') || t.includes('tls')) return 'config';
  if (t.includes('logic')) return 'logic';
  if (t.includes('cve') || t.includes('depend') || t.includes('vulnerable package')) return 'deps';
  return 'other';
}

const COVERAGE_CATEGORIES = [
  { key: 'secrets', label: 'Exposed Secrets' },
  { key: 'injection', label: 'Injection Vulnerabilities' },
  { key: 'auth', label: 'Insecure Authentication' },
  { key: 'access', label: 'Improper Access Control' },
  { key: 'config', label: 'Insecure Configuration' },
  { key: 'logic', label: 'Logic Errors' },
  { key: 'deps', label: 'Unsafe Dependencies' },
];

// The 9 tiles shown on the Dashboard's "Security capabilities" grid. The
// first 7 map 1:1 to COVERAGE_CATEGORIES (status driven by real findings);
// the last 2 are always-on pipeline stages (no per-finding category).
const CAPABILITY_TILES = [
  { key: 'secrets', label: 'Exposed secrets', detectedLabel: 'Detected', cleanLabel: 'Clean', icon: KeyRound },
  { key: 'auth', label: 'Insecure authentication', detectedLabel: 'AI analyzed', cleanLabel: 'Clean', icon: Lock },
  { key: 'access', label: 'Improper access control', detectedLabel: 'AI analyzed', cleanLabel: 'Clean', icon: ShieldAlert },
  { key: 'injection', label: 'Injection vulnerabilities', detectedLabel: 'Detected', cleanLabel: 'Clean', icon: Zap },
  { key: 'deps', label: 'Unsafe dependencies', detectedLabel: 'OSV checked', cleanLabel: 'Clean', icon: Package },
  { key: 'config', label: 'Insecure configurations', detectedLabel: 'AI analyzed', cleanLabel: 'Clean', icon: Sliders },
  { key: 'logic', label: 'Logic errors', detectedLabel: 'AI analyzed', cleanLabel: 'Clean', icon: Brain },
  { key: 'ai-prioritization', label: 'AI prioritization', always: 'Active', icon: Brain },
  { key: 'fp-reduction', label: 'False positive reduction', always: 'Confidence based', icon: CheckCircle2 },
];

// Groups the fine-grained categoryOf() buckets into the 4 rows shown in the
// Dashboard's "Findings by category" bar chart.
function dashboardCategoryOf(f) {
  const c = categoryOf(f);
  if (c === 'injection') return 'Injection';
  if (c === 'secrets') return 'Secrets';
  if (c === 'deps') return 'Dependencies';
  return 'Others';
}

// "1. What do you want to scan?" tabs. Config/Deps/Upload set scanType,
// which handleScan() uses to decide how to build the request body — Deps
// always sends packageJson, Upload reads the picked file's text into `code`.
const SCAN_TYPES = [
  { key: 'code', label: 'Source Code', desc: '.js, .py, .java, .cpp and more', icon: Code2 },
  { key: 'config', label: 'Configuration', desc: '.env, .json, .yml, docker etc.', icon: Sliders },
  { key: 'deps', label: 'Dependencies', desc: 'package.json, requirements.txt', icon: Package },
  { key: 'upload', label: 'File Upload', desc: 'Upload any file to scan', icon: UploadCloud },
];

// "3. Scan Configuration" checkboxes. Only `secrets` maps to a real backend
// param (entropyEnabled) — the rest reflect stages the backend always runs
// on every scan, so toggling them off here is visual only for now (there's
// no per-check on/off support in the /scan endpoint yet).
const CHECK_ITEMS = [
  { key: 'secrets', title: 'Secret Detection', desc: 'Detect API keys, tokens, passwords, etc.' },
  { key: 'vuln', title: 'Vulnerability Analysis', desc: 'Detect common security vulnerabilities' },
  { key: 'deps', title: 'Dependency Check', desc: 'Check for vulnerable dependencies' },
  { key: 'aiContext', title: 'AI Context Analysis', desc: 'AI analyzes code context & intent' },
  { key: 'riskPrioritization', title: 'Risk Prioritization', desc: 'Prioritize based on impact & exploitability' },
  { key: 'confidence', title: 'Confidence Analysis', desc: 'Reduce false positives with confidence' },
];

// "5. Analysis Pipeline" — the backend does this in one request, so there
// are no real per-stage events to hook into. Each step shows pending before
// a scan, running while the request is in flight, and complete once results
// come back — an honest simplification rather than faked per-stage timing.
const PIPELINE_STEPS = [
  { key: 'input', label: 'Input Validation', icon: FileText },
  { key: 'secrets', label: 'Secrets & Entropy', icon: KeyRound },
  { key: 'vuln', label: 'Vulnerability Scan', icon: Bug },
  { key: 'deps', label: 'Dependency Check', icon: Package },
  { key: 'ai', label: 'AI Analysis', icon: Brain },
  { key: 'risk', label: 'Risk Prioritization', icon: ShieldAlert },
  { key: 'confidence', label: 'Confidence Analysis', icon: CheckCircle2 },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function parseFindings(scan) {
  if (!scan) return [];
  if (Array.isArray(scan.findings)) return scan.findings;
  if (typeof scan.findings === 'string') {
    try { return JSON.parse(scan.findings); } catch { return []; }
  }
  return [];
}

// Dashboard — reads only from real state (results = latest in-session scan,
// history = all saved scans from GET /history). No mock data.
function DashboardPanel({ results, history, historyLoading }) {
  const sortedHistory = [...history].sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
  // Prefer the live `results` from the current session (has the freshest
  // findings array); fall back to the most recent saved scan.
  const latest = results || sortedHistory[0] || null;
  const latestFindings = results ? (results.findings || []) : parseFindings(sortedHistory[0]);

  const critical = latest?.critical ?? 0;
  const high = latest?.highSeverity ?? 0;
  const medium = latest?.mediumSeverity ?? 0;
  const low = latest?.lowSeverity ?? 0;
  const total = latest?.totalFindings ?? (critical + high + medium + low);
  const riskScore = latest?.riskScore ?? 0;
  const riskLevel = latest?.riskLevel ?? '—';

  const categoriesPresent = new Set(latestFindings.map(dashboardCategoryOf)).size;

  const confidences = latestFindings.filter((f) => typeof f.confidence === 'number');
  const aiConfidence = confidences.length
    ? Math.round((confidences.reduce((sum, f) => sum + f.confidence, 0) / confidences.length) * 100)
    : null;

  const now = new Date();
  const thisMonthScans = history.filter((s) => {
    const d = new Date(s.scannedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthScans = history.filter((s) => {
    const d = new Date(s.scannedAt);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const monthDelta = lastMonthScans.length
    ? Math.round(((thisMonthScans.length - lastMonthScans.length) / lastMonthScans.length) * 100)
    : null;

  const severityData = [
    { label: 'Critical', count: critical, color: '#e2504a' },
    { label: 'High', count: high, color: '#e8a33d' },
    { label: 'Medium', count: medium, color: '#d9c94f' },
    { label: 'Low', count: low, color: '#4fd08a' },
  ];

  const categoryLabels = ['Injection', 'Secrets', 'Dependencies', 'Others'];
  const categoryCounts = categoryLabels.map((label) => ({
    label,
    count: latestFindings.filter((f) => dashboardCategoryOf(f) === label).length,
  }));
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((c) => c.count));

  // Last 7 scans, oldest to latest, for the risk trend line.
  const trendScans = [...sortedHistory].slice(0, 7).reverse();

  const recentScans = sortedHistory.slice(0, 3);

  const topVulns = [...latestFindings]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[(a.severity || '').toLowerCase()] ?? 4) - (order[(b.severity || '').toLowerCase()] ?? 4);
    })
    .slice(0, 3);

  const hasAnyData = Boolean(latest);

  return (
    <section className="panel wide-panel dashboard-panel">
      <div className="panel-head">
        <div className="panel-icon"><Home size={18} /></div>
        <div><h2>Dashboard</h2><p>Overview of your security posture and recent scans.</p></div>
      </div>

      {historyLoading && !hasAnyData && (
        <div className="empty-state">
          <Clock size={56} className="empty-icon" />
          <h3>Loading your scan data…</h3>
        </div>
      )}

      {!historyLoading && !hasAnyData && (
        <div className="empty-state">
          <Home size={56} className="empty-icon" />
          <h3>No scans yet.</h3>
          <p className="empty-sub">Run a scan from Code Scan and your dashboard will populate automatically.</p>
        </div>
      )}

      {hasAnyData && (
        <>
          <div className="dash-stats-grid">
            <div className="dash-stat-card">
              <div className="dash-stat-head"><span className="dash-stat-icon" style={{ background: '#3a1d1d', color: '#e2504a' }}><ShieldAlert size={14} /></span>Risk score</div>
              <div className="dash-stat-value">{riskScore}<span> / 100</span></div>
              <div className="dash-stat-sub" style={{ color: '#e8a33d' }}>{riskLevel} risk</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-head"><span className="dash-stat-icon" style={{ background: '#241a3a', color: '#a98cf0' }}><FileText size={14} /></span>Total findings</div>
              <div className="dash-stat-value">{total}</div>
              <div className="dash-stat-sub">Across {categoriesPresent} categor{categoriesPresent === 1 ? 'y' : 'ies'}</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-head"><span className="dash-stat-icon" style={{ background: '#12301f', color: '#4fd08a' }}><CheckCircle2 size={14} /></span>AI confidence</div>
              <div className="dash-stat-value">{aiConfidence !== null ? `${aiConfidence}%` : '—'}</div>
              <div className="dash-stat-sub" style={{ color: '#4fd08a' }}>{aiConfidence !== null ? 'From analyzed findings' : 'No AI findings yet'}</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-head"><span className="dash-stat-icon" style={{ background: '#12283a', color: '#3ba7f0' }}><Clock size={14} /></span>Last scan</div>
              <div className="dash-stat-value" style={{ fontSize: '16px' }}>{sortedHistory[0] ? formatDate(sortedHistory[0].scannedAt) : 'Just now'}</div>
              <div className="dash-stat-sub">Completed</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-head"><span className="dash-stat-icon" style={{ background: '#12283a', color: '#3ba7f0' }}><CalendarDays size={14} /></span>Scans this month</div>
              <div className="dash-stat-value">{thisMonthScans.length}</div>
              <div className="dash-stat-sub" style={{ color: monthDelta === null ? undefined : monthDelta >= 0 ? '#4fd08a' : '#e2504a' }}>
                {monthDelta === null ? 'No data for last month' : `${monthDelta >= 0 ? '↑' : '↓'} ${Math.abs(monthDelta)}% vs last month`}
              </div>
            </div>
          </div>

          <div className="dash-mid-grid">
            <div className="dash-sub-panel">
              <h3>Findings by severity</h3>
              <div className="dash-donut-row">
                <svg width="100" height="100" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#232633" strokeWidth="6" />
                  {(() => {
                    let offset = 25;
                    return severityData.map((s) => {
                      const pct = total > 0 ? (s.count / total) * 100 : 0;
                      const circle = (
                        <circle
                          key={s.label}
                          cx="21" cy="21" r="15.9" fill="transparent"
                          stroke={s.color} strokeWidth="6"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={offset}
                        />
                      );
                      offset -= pct;
                      return circle;
                    });
                  })()}
                  <text x="21" y="19" textAnchor="middle" fontSize="7" fill="#e8e9ee" fontWeight="700">{total}</text>
                  <text x="21" y="26" textAnchor="middle" fontSize="4" fill="#5c5f6d">Total</text>
                </svg>
                <div className="dash-legend">
                  {severityData.map((s) => (
                    <div className="dash-legend-item" key={s.label}>
                      <span className="dash-dot" style={{ background: s.color }} />{s.label}
                      <span className="dash-legend-count">{s.count} ({total > 0 ? Math.round((s.count / total) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dash-sub-panel">
              <h3>Findings by category</h3>
              {categoryCounts.map((c) => (
                <div className="dash-cat-row" key={c.label}>
                  <div className="dash-cat-label">{c.label}</div>
                  <div className="dash-cat-track"><div className="dash-cat-fill" style={{ width: `${(c.count / maxCategoryCount) * 100}%` }} /></div>
                  <div className="dash-cat-count">{c.count}</div>
                </div>
              ))}
            </div>

            <div className="dash-sub-panel">
              <h3>Risk trend</h3>
              <p className="dash-sub-caption">Last {trendScans.length || 0} scans</p>
              {trendScans.length === 0 && <p className="empty-sub">Not enough history yet.</p>}
              {trendScans.length > 0 && (
                <svg width="100%" height="110" viewBox="0 0 260 100" preserveAspectRatio="none">
                  <polyline
                    fill="none" stroke="#e8a33d" strokeWidth="2"
                    points={trendScans.map((s, i) => {
                      const x = trendScans.length > 1 ? (i / (trendScans.length - 1)) * 250 + 5 : 130;
                      const y = 90 - ((s.riskScore ?? 0) / 100) * 80;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {trendScans.map((s, i) => {
                    const x = trendScans.length > 1 ? (i / (trendScans.length - 1)) * 250 + 5 : 130;
                    const y = 90 - ((s.riskScore ?? 0) / 100) * 80;
                    return <circle key={i} cx={x} cy={y} r="3" fill="#e8a33d" />;
                  })}
                </svg>
              )}
            </div>
          </div>

          <div className="dash-sub-panel" style={{ marginBottom: '16px' }}>
            <h3>Security capabilities ({CAPABILITY_TILES.length})</h3>
            <p className="dash-sub-caption">Status reflects your most recent scan.</p>
            <div className="dash-cap-grid">
              {CAPABILITY_TILES.map((cap, i) => {
                const Icon = cap.icon;
                const hasFinding = cap.key !== 'ai-prioritization' && cap.key !== 'fp-reduction'
                  ? latestFindings.some((f) => categoryOf(f) === cap.key)
                  : false;
                const status = cap.always ?? (hasFinding ? cap.detectedLabel : cap.cleanLabel);
                const statusColor = cap.always ? '#a98cf0' : hasFinding ? '#e8a33d' : '#4fd08a';
                return (
                  <div className="dash-cap-card" key={cap.key}>
                    <div className="dash-cap-icon"><Icon size={14} /></div>
                    <div className="dash-cap-title">{i + 1}. {cap.label}</div>
                    <div className="dash-cap-status" style={{ color: statusColor }}>{status}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dash-bottom-grid">
            <div className="dash-sub-panel">
              <div className="dash-panel-title-row"><h3>Recent scans</h3></div>
              {recentScans.length === 0 && <p className="empty-sub">No saved scans yet.</p>}
              {recentScans.map((s) => (
                <div className="dash-scan-row" key={s.id}>
                  <div className="dash-scan-icon"><Clock size={14} /></div>
                  <div className="dash-scan-meta">
                    <div className="dash-scan-name">{formatDate(s.scannedAt)}</div>
                    <div className="dash-scan-time">{s.totalFindings ?? ((s.critical ?? 0) + (s.highSeverity ?? 0) + (s.mediumSeverity ?? 0) + (s.lowSeverity ?? 0))} findings</div>
                  </div>
                  <span className={`sev-pill ${severityClass(s.riskLevel)}`} style={severityClass(s.riskLevel) === 'sev-critical' ? CRITICAL_FALLBACK : undefined}>
                    {s.riskScore ?? 0} {s.riskLevel ?? ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="dash-sub-panel">
              <div className="dash-panel-title-row"><h3>Top vulnerabilities</h3></div>
              {topVulns.length === 0 && <p className="empty-sub">No findings in the latest scan.</p>}
              {topVulns.map((f, i) => (
                <div className="dash-scan-row" key={i}>
                  <div className="dash-scan-meta">
                    <div className="dash-scan-name">{f.type}</div>
                  </div>
                  <span className={`sev-pill ${severityClass(f.severity)}`} style={severityClass(f.severity) === 'sev-critical' ? CRITICAL_FALLBACK : undefined}>
                    {f.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Collapsible recommendations list — shows first 3, expandable to see the rest
function RecommendationsList({ items }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  return (
    <div className="finding-card">
      <div className="finding-type">Recommendations ({items.length})</div>
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visible.map((r, i) => (
          <div key={i} className="finding-preview">{r}</div>
        ))}
      </div>
      {items.length > 3 && (
        <button className="text-btn" style={{ marginTop: '8px' }} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `Show ${items.length - 3} more`}
        </button>
      )}
    </div>
  );
}

// A single finding card. Expandable when it has an explanation and/or fix
// (LLM findings and dependency findings have these — plain pattern/entropy
// findings don't, so those cards just stay flat like before).
function FindingItem({ f }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(f.explanation || f.fix);
  const isCritical = severityClass(f.severity) === 'sev-critical';

  return (
    <div
      className="finding-card"
      style={hasDetail ? { cursor: 'pointer' } : undefined}
      onClick={() => hasDetail && setOpen((o) => !o)}
    >
      <div className="finding-top">
        <span className={`sev-pill ${severityClass(f.severity)}`} style={isCritical ? CRITICAL_FALLBACK : undefined}>
          {f.severity}
        </span>
        {f.line ? <span className="finding-line">line {f.line}</span> : <span className="finding-line" />}
      </div>
      <div className="finding-type">{f.type}</div>
      <div className="finding-preview">{f.matchPreview}</div>
      {f.method && <span className="finding-method">{f.method}</span>}

      {hasDetail && (
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: 0.7 }}>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>{open ? 'Hide details' : 'Why it matters + fix'}</span>
        </div>
      )}

      {open && hasDetail && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}>
          {f.explanation && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ opacity: 0.6 }}>Why it matters: </span>{f.explanation}
            </div>
          )}
          {f.fix && (
            <div>
              <span style={{ opacity: 0.6 }}>Suggested fix: </span>{f.fix}
            </div>
          )}
          {typeof f.confidence === 'number' && (
            <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.55 }}>
              {Math.round(f.confidence * 100)}% confidence
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Code Scan history row
function HistoryRow({ scan }) {
  const [open, setOpen] = useState(false);
  const findings = typeof scan.findings === 'string' ? JSON.parse(scan.findings) : scan.findings;

  return (
    <div className="finding-card" style={{ cursor: 'pointer' }}>
      <div className="finding-top" onClick={() => setOpen(!open)}>
        <span className="finding-line">{formatDate(scan.scannedAt)}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      <div className="summary-row" style={{ marginTop: '8px', marginBottom: open ? '10px' : 0 }}>
        {scan.riskLevel && (
          <div className="summary-chip" style={severityClass(scan.riskLevel) === 'sev-critical' ? CRITICAL_FALLBACK : undefined}>
            risk: {scan.riskLevel}
          </div>
        )}
        <div className="summary-chip sev-high">{scan.highSeverity} high</div>
        <div className="summary-chip sev-medium">{scan.mediumSeverity} medium</div>
        <div className="summary-chip sev-low">{scan.lowSeverity} low</div>
      </div>
      {open && (
        <div className="findings-list" style={{ marginTop: '10px' }}>
          {findings.map((f, i) => (
            <FindingItem key={i} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

// Collapsible findings list for Code Scan results
function CodeFindingsList({ findings, criticalCount, highCount, mediumCount, lowCount }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? findings : findings.slice(0, 3);

  return (
    <>
      <div className="summary-row">
        {criticalCount > 0 && (
          <div className="summary-chip" style={CRITICAL_FALLBACK}>{criticalCount} critical</div>
        )}
        <div className="summary-chip sev-high">{highCount} high</div>
        <div className="summary-chip sev-medium">{mediumCount} medium</div>
        <div className="summary-chip sev-low">{lowCount} low</div>
      </div>
      <div className="findings-list" style={{ marginTop: '10px' }}>
        {visible.map((f, i) => (
          <FindingItem key={i} f={f} />
        ))}
      </div>
      {findings.length > 3 && (
        <button className="text-btn" style={{ marginTop: '10px' }} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `Show ${findings.length - 3} more`}
        </button>
      )}
    </>
  );
}

// Dependency Check — standalone package.json scanner. Currently posts to the
// same /scan endpoint your Code Scan tab uses (it already supports a
// `packageJson` field). Swap the body of handleDepScan() for a client-side
// call once depscanner.js is wired in, if that's meant to replace this.
function DependencyCheckPanel() {
  const [pkgInput, setPkgInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function handleDepScan() {
    if (!pkgInput.trim() || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '// package.json dependency scan',
          packageJson: pkgInput,
          entropyEnabled: false,
        }),
      });
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? "Can't reach the scanner backend. Is it running on localhost:4000?"
          : err.message
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className="panel wide-panel">
      <div className="panel-head">
        <div className="panel-icon"><Package size={18} /></div>
        <div>
          <h2>Dependency check</h2>
          <p>Paste your package.json to check for known CVEs in your dependencies.</p>
        </div>
      </div>

      <div className="field-row">
        <span className="field-label">Paste package.json</span>
        <button
          className="text-btn"
          onClick={() => { setPkgInput(''); setResults(null); setError(null); }}
        >
          <Trash2 size={13} /> Clear
        </button>
      </div>
      <textarea
        className="code-input"
        placeholder='{"dependencies": {"lodash": "4.17.4"}}'
        value={pkgInput}
        onChange={(e) => setPkgInput(e.target.value)}
      />

      {error && <div className="scan-error"><AlertTriangle size={14} /> {error}</div>}

      <button className="scan-btn" onClick={handleDepScan} disabled={scanning || !pkgInput.trim()}>
        <Search size={16} /> {scanning ? 'Checking…' : 'Check dependencies'}
      </button>

      {results && results.totalFindings === 0 && (
        <div className="empty-state" style={{ marginTop: '16px' }}>
          <CheckCircle2 size={40} className="empty-icon success" />
          <h3>No known vulnerabilities found.</h3>
        </div>
      )}

      {results && results.totalFindings > 0 && (
        <div style={{ marginTop: '16px' }}>
          <CodeFindingsList
            findings={results.findings}
            criticalCount={results.critical ?? 0}
            highCount={results.highSeverity ?? 0}
            mediumCount={results.mediumSeverity ?? 0}
            lowCount={results.lowSeverity ?? 0}
          />
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [code, setCode] = useState('');
  const [activeNav, setActiveNav] = useState('Code Scan');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entropyOn, setEntropyOn] = useState(true);
  const [autoClear, setAutoClear] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // In-memory only for now — no backend table for this yet, so it resets on
  // refresh. Wire to a real endpoint later if you want it to persist.
  const [savedSnippets, setSavedSnippets] = useState([]);

  // Security Scan tab state
  const [scanType, setScanType] = useState('code');
  const [checks, setChecks] = useState({
    secrets: true, vuln: true, deps: true, aiContext: true, riskPrioritization: true, confidence: true,
  });
  const [analysisDepth, setAnalysisDepth] = useState('standard');
  const [uploadFileName, setUploadFileName] = useState('');
  const [scanDurationMs, setScanDurationMs] = useState(null);

  function toggleCheck(key) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCode(String(ev.target.result || ''));
    reader.readAsText(file);
  }

  useEffect(() => {
    if (activeNav === 'Scan History' || activeNav === 'Dashboard') {
      fetchHistory();
    }
  }, [activeNav]);

  async function fetchHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(`${API_URL}/history`);
      if (!res.ok) throw new Error(`Could not load history (${res.status})`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setHistoryError(
        err.message === 'Failed to fetch'
          ? "Can't reach the backend. Is it running on localhost:4000?"
          : err.message
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleScan() {
    if (!code.trim() || scanning) return;
    setScanning(true);
    setError(null);
    setScanDurationMs(null);
    const startedAt = Date.now();
    try {
      const trimmed = code.trim();
      let body = { code, entropyEnabled: checks.secrets };

      // Dependencies tab always treats the input as a package.json. For the
      // other tabs, auto-detect: if the pasted content is valid JSON with a
      // dependencies/devDependencies key, route it the same way. The backend
      // still needs a non-empty `code` field, so we send a harmless
      // placeholder alongside packageJson.
      const looksLikePackageJson = (() => {
        if (!trimmed.startsWith('{')) return false;
        try {
          const parsed = JSON.parse(trimmed);
          return Boolean(parsed.dependencies || parsed.devDependencies);
        } catch {
          return false;
        }
      })();

      if (scanType === 'deps' || looksLikePackageJson) {
        body = {
          code: '// package.json dependency scan',
          packageJson: trimmed,
          entropyEnabled: checks.secrets,
        };
      }

      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = await res.json();
      setResults(data);
      setScanDurationMs(Date.now() - startedAt);
      if (autoClear) setCode('');
      // Refresh history in the background so the Dashboard/Scan History
      // reflect this scan immediately without waiting for a tab switch.
      fetchHistory();
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? "Can't reach the scanner backend. Is it running on localhost:4000?"
          : err.message
      );
    } finally {
      setScanning(false);
    }
  }

  function handleClear() {
    setCode('');
    setResults(null);
    setError(null);
  }

  function goToNav(label) {
    setActiveNav(label);
    setSidebarOpen(false);
  }

  function handleNavClick(item) {
    if (item.special === 'modal') {
      setHowItWorksOpen(true);
      setSidebarOpen(false);
      return;
    }
    goToNav(item.label);
  }

  function handleSaveSnippet() {
    if (!code.trim()) return;
    const name = window.prompt('Name this snippet:', `Snippet ${savedSnippets.length + 1}`);
    if (!name) return;
    setSavedSnippets((prev) => [
      { id: Date.now(), name, code, savedAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  function renderPlaceholderPanel() {
    if (activeNav === 'Dashboard') {
      return <DashboardPanel results={results} history={history} historyLoading={historyLoading} />;
    }

    if (activeNav === 'Scan Results') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><FileText size={18} /></div>
            <div>
              <h2>Scan results</h2>
              {results && results.riskLevel && (
                <p style={{ margin: 0 }}>Risk score: {results.riskScore ?? 0} · {results.riskLevel}</p>
              )}
            </div>
            <span className="results-badge">{results ? results.totalFindings : 0} results</span>
          </div>

          {!results && (
            <div className="empty-state">
              <FileText size={56} className="empty-icon" />
              <h3>No scan run yet.</h3>
              <p className="empty-sub">Head to Code Scan to run one — results mirror here.</p>
            </div>
          )}

          {results && results.totalFindings === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={56} className="empty-icon success" />
              <h3>No secrets found. Nice and clean.</h3>
            </div>
          )}

          {results && results.totalFindings > 0 && (
            <CodeFindingsList
              findings={results.findings}
              criticalCount={results.critical ?? 0}
              highCount={results.highSeverity ?? 0}
              mediumCount={results.mediumSeverity ?? 0}
              lowCount={results.lowSeverity ?? 0}
            />
          )}
        </section>
      );
    }

    if (activeNav === 'Scan History') {
      const allHistory = [...history].sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));

      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Clock size={18} /></div>
            <div><h2>Scan history</h2><p>All scans saved to the database, most recent first.</p></div>
          </div>

          {historyLoading && (
            <div className="empty-state">
              <Clock size={56} className="empty-icon" />
              <h3>Loading past scans...</h3>
            </div>
          )}

          {historyError && (
            <div className="empty-state">
              <AlertTriangle size={56} className="empty-icon" />
              <h3>Could not load history.</h3>
              <p className="empty-sub">{historyError}</p>
            </div>
          )}

          {!historyLoading && !historyError && allHistory.length === 0 && (
            <div className="empty-state">
              <Clock size={56} className="empty-icon" />
              <h3>No past scans yet.</h3>
              <p className="empty-sub">Run a scan from Code Scan and it'll show up here.</p>
            </div>
          )}

          {!historyLoading && !historyError && allHistory.length > 0 && (
            <div className="findings-list">
              {allHistory.map((scan) => (
                <HistoryRow key={scan.id} scan={scan} />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeNav === 'Compare Scans') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><GitCompare size={18} /></div>
            <div><h2>Compare scans</h2><p>See what changed between two scans.</p></div>
          </div>
          <div className="empty-state">
            <GitCompare size={56} className="empty-icon" />
            <h3>Not built yet.</h3>
            <p className="empty-sub">Reserved for diffing two scans from history — needs a compare endpoint on the backend first.</p>
          </div>
        </section>
      );
    }

    if (activeNav === 'Reports') {
      const findings = results?.findings || [];
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><BarChart2 size={18} /></div>
            <div><h2>Reports</h2><p>A summary of your latest scan, broken down by category.</p></div>
          </div>

          {!results && (
            <div className="empty-state">
              <BarChart2 size={56} className="empty-icon" />
              <h3>Run a scan to generate a report.</h3>
            </div>
          )}

          {results && (
            <>
              <div className="finding-card">
                <div className="finding-type">Overall risk</div>
                <div className="finding-preview">{results.riskScore ?? 0} / 100 — {results.riskLevel}</div>
              </div>
              <div className="findings-list" style={{ marginTop: '12px' }}>
                {COVERAGE_CATEGORIES.map(({ key, label }) => {
                  const count = findings.filter((f) => categoryOf(f) === key).length;
                  return (
                    <div className="finding-card" key={key}>
                      <div className="finding-top">
                        <span className={`sev-pill ${count ? 'sev-high' : 'sev-low'}`}>
                          {count} finding{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="finding-type">{label}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      );
    }

    if (activeNav === 'Security Coverage') {
      const findings = results?.findings || [];
      const counts = {};
      findings.forEach((f) => {
        const c = categoryOf(f);
        counts[c] = (counts[c] || 0) + 1;
      });

      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><ShieldAlert size={18} /></div>
            <div>
              <h2>Security coverage</h2>
              <p>What SecureCode checks for on every scan, and what your last scan found.</p>
            </div>
          </div>

          {!results && (
            <div className="empty-state">
              <ShieldAlert size={56} className="empty-icon" />
              <h3>Run a scan to see coverage.</h3>
              <p className="empty-sub">Coverage is based on your most recent scan from Code Scan.</p>
            </div>
          )}

          {results && (
            <div className="findings-list">
              {COVERAGE_CATEGORIES.map(({ key, label }) => (
                <div className="finding-card" key={key}>
                  <div className="finding-top">
                    <span className={`sev-pill ${counts[key] ? 'sev-high' : 'sev-low'}`}>
                      {counts[key] ? `${counts[key]} found` : 'Clean'}
                    </span>
                  </div>
                  <div className="finding-type">{label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeNav === 'Secrets Detection' || activeNav === 'Configuration Check') {
      const key = activeNav === 'Secrets Detection' ? 'secrets' : 'config';
      const Icon = activeNav === 'Secrets Detection' ? KeyRound : Sliders;
      const filtered = (results?.findings || []).filter((f) => categoryOf(f) === key);

      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Icon size={18} /></div>
            <div>
              <h2>{activeNav}</h2>
              <p>Findings from your last scan, filtered to this category.</p>
            </div>
          </div>

          {!results && (
            <div className="empty-state">
              <Icon size={56} className="empty-icon" />
              <h3>Run a scan to see results here.</h3>
            </div>
          )}

          {results && filtered.length === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={56} className="empty-icon success" />
              <h3>Nothing found in this category.</h3>
            </div>
          )}

          {results && filtered.length > 0 && (
            <div className="findings-list">
              {filtered.map((f, i) => (
                <FindingItem key={i} f={f} />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeNav === 'Dependency Check') {
      return <DependencyCheckPanel />;
    }

    if (activeNav === 'AI Prioritization') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Brain size={18} /></div>
            <div>
              <h2>AI prioritization</h2>
              <p>How SecureCode ranks findings by real-world risk, not just pattern matches.</p>
            </div>
          </div>

          {!results && (
            <div className="empty-state">
              <Brain size={56} className="empty-icon" />
              <h3>Run a scan to see a risk score.</h3>
            </div>
          )}

          {results && (
            <>
              <div className="summary-row">
                {(results.critical ?? 0) > 0 && (
                  <div className="summary-chip" style={CRITICAL_FALLBACK}>{results.critical} critical</div>
                )}
                <div className="summary-chip sev-high">{results.highSeverity ?? 0} high</div>
                <div className="summary-chip sev-medium">{results.mediumSeverity ?? 0} medium</div>
                <div className="summary-chip sev-low">{results.lowSeverity ?? 0} low</div>
              </div>
              <div className="finding-card" style={{ marginTop: '14px' }}>
                <div className="finding-type">Overall risk score</div>
                <div className="finding-preview">{results.riskScore ?? 0} / 100 — {results.riskLevel}</div>
              </div>
              <p className="about-text" style={{ marginTop: '14px' }}>
                Each finding's severity, confidence, and exploitability are combined into a
                single risk score, so the most dangerous issues surface first instead of being
                buried in a flat list.
              </p>
            </>
          )}
        </section>
      );
    }

    if (activeNav === 'Projects') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Folder size={18} /></div>
            <div><h2>Projects</h2><p>Group scans by codebase or repo.</p></div>
          </div>
          <div className="empty-state">
            <Folder size={56} className="empty-icon" />
            <h3>Not built yet.</h3>
            <p className="empty-sub">Reserved for grouping scan history by project — needs a projects table on the backend first.</p>
          </div>
        </section>
      );
    }

    if (activeNav === 'Saved Snippets') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Bookmark size={18} /></div>
            <div>
              <h2>Saved snippets</h2>
              <p>Save code you test often and reload it into Code Scan in one click. Kept in this browser session only — not saved to the database yet.</p>
            </div>
          </div>

          <button className="scan-btn" style={{ marginBottom: '14px' }} onClick={handleSaveSnippet} disabled={!code.trim()}>
            <Bookmark size={16} /> Save current code
          </button>

          {savedSnippets.length === 0 && (
            <div className="empty-state">
              <Bookmark size={56} className="empty-icon" />
              <h3>No snippets saved yet.</h3>
              <p className="empty-sub">Paste code in Code Scan, then come back here to save it.</p>
            </div>
          )}

          {savedSnippets.length > 0 && (
            <div className="findings-list">
              {savedSnippets.map((s) => (
                <div
                  className="finding-card"
                  key={s.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setCode(s.code); goToNav('Code Scan'); }}
                >
                  <div className="finding-top">
                    <span className="finding-line">{formatDate(s.savedAt)}</span>
                    <Trash2
                      size={14}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedSnippets((prev) => prev.filter((x) => x.id !== s.id));
                      }}
                    />
                  </div>
                  <div className="finding-type">{s.name}</div>
                  <div className="finding-preview">
                    {s.code.slice(0, 80)}{s.code.length > 80 ? '…' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeNav === 'Settings') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Settings size={18} /></div>
            <div><h2>Settings</h2><p>Control how SecureCode scans your code.</p></div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Entropy detection</div>
              <div className="settings-sub">Flag high-randomness strings that don't match a known pattern.</div>
            </div>
            <button
              className={`toggle ${entropyOn ? 'on' : ''}`}
              onClick={() => setEntropyOn(!entropyOn)}
              aria-label="Toggle entropy detection"
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Auto-clear after scan</div>
              <div className="settings-sub">Empty the code box automatically once results come back.</div>
            </div>
            <button
              className={`toggle ${autoClear ? 'on' : ''}`}
              onClick={() => setAutoClear(!autoClear)}
              aria-label="Toggle auto-clear"
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </section>
      );
    }
    if (activeNav === 'About') {
      return (
        <section className="panel wide-panel">
          <div className="panel-head">
            <div className="panel-icon"><Info size={18} /></div>
            <div><h2>About SecureCode</h2></div>
          </div>
          <p className="about-text">
            SecureCode scans pasted code, configs, and dependency files for exposed secrets,
            injection flaws, broken authentication, access control issues, insecure
            configuration, logic errors, and vulnerable dependencies. Pattern matching and
            entropy detection catch known secret formats and random-looking strings; an AI
            layer reads the code semantically to catch what regex can't. Every finding is
            explained in plain English with a suggested fix, and every scan is saved so you
            can revisit it later.
          </p>
        </section>
      );
    }
    return null;
  }

  return (
    <div className={`app ${theme === 'light' ? 'theme-light' : ''}`}>
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={20} /></div>
          <div>
            <div className="brand-name">SecureCode</div>
            <div className="brand-tag">Paste code. Find what's leaking.</div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: '18px' }}>
              <div
                style={{
                  padding: '0 12px 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  opacity: 0.45,
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`nav-item ${item.special !== 'modal' && activeNav === item.label ? 'active' : ''}`}
                    onClick={() => handleNavClick(item)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">© 2026 SecureCode<br />All rights reserved.</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="topbar-icon"><ShieldCheck size={20} /></div>
          <div className="topbar-text">
            <h1>Welcome to <span className="accent-grad">SecureCode</span></h1>
            <p>Scan your code for secrets, keys, and vulnerabilities.</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" onClick={() => setHowItWorksOpen(true)}>
              <HelpCircle size={16} /> How it works
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {howItWorksOpen && (
          <div className="modal-backdrop" onClick={() => setHowItWorksOpen(false)}>
            <div className="panel how-it-works-modal" onClick={(e) => e.stopPropagation()}>
              <div className="panel-head">
                <div className="panel-icon"><HelpCircle size={18} /></div>
                <div><h2>How it works</h2></div>
                <button className="icon-btn" onClick={() => setHowItWorksOpen(false)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <ul className="how-it-works-steps">
                <li>
                  <span className="step-number">1</span>
                  <div>
                    <strong>Paste your code</strong>
                    <p>Any file, snippet, or config — .py, .js, .env, .json, .yml and more. Paste a package.json to check dependencies too.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">2</span>
                  <div>
                    <strong>We scan it four ways</strong>
                    <p>Pattern matching catches known key formats. Entropy detection flags random-looking strings. An AI layer reads the code semantically for injection, broken auth, access control, and config issues. A dependency check looks up known CVEs for your packages.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">3</span>
                  <div>
                    <strong>Get a prioritized, explained report</strong>
                    <p>Every finding shows type, severity, and line number, with a plain-English explanation and suggested fix where available. Secrets are always masked.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">4</span>
                  <div>
                    <strong>Revisit anytime</strong>
                    <p>Every scan is saved, so you can check Scan History later without re-scanning.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeNav !== 'Code Scan' && renderPlaceholderPanel()}

        {activeNav === 'Code Scan' && (() => {
          const confidences = (results?.findings || []).filter((f) => typeof f.confidence === 'number');
          const aiConfidence = confidences.length
            ? Math.round((confidences.reduce((sum, f) => sum + f.confidence, 0) / confidences.length) * 100)
            : null;
          const pipelineState = scanning ? 'running' : results ? 'done' : 'idle';

          return (
          <>
          <section className="panel" style={{ marginBottom: '14px' }}>
            <div className="field-label" style={{ marginBottom: '10px' }}>1. What do you want to scan?</div>
            <div className="scan-type-grid">
              {SCAN_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    className={`scan-type-card ${scanType === t.key ? 'active' : ''}`}
                    onClick={() => setScanType(t.key)}
                  >
                    <Icon size={18} />
                    <div className="scan-type-label">{t.label}</div>
                    <div className="scan-type-desc">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="content-grid">
            <div className="left-col">
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-icon"><Code2 size={18} /></div>
                  <div>
                    <h2>2. Code / File to scan</h2>
                  </div>
                  {scanType === 'upload' ? (
                    <label className="text-btn" style={{ marginLeft: 'auto', cursor: 'pointer' }}>
                      <UploadCloud size={13} /> Upload file
                      <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  ) : (
                    <button className="text-btn" style={{ marginLeft: 'auto' }} onClick={handleClear}>
                      <Trash2 size={13} /> Clear
                    </button>
                  )}
                </div>

                {scanType === 'upload' && uploadFileName && (
                  <div className="field-row"><span className="field-label">{uploadFileName}</span></div>
                )}

                <textarea
                  className="code-input"
                  placeholder={
                    scanType === 'deps'
                      ? 'Paste your package.json or requirements.txt'
                      : scanType === 'config'
                      ? 'Paste your .env, .yml, or other config file'
                      : scanType === 'upload'
                      ? 'Upload a file above, or paste its contents here'
                      : 'Paste a file, a snippet, a config, or a package.json — anything with strings in it.'
                  }
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />

                <div className="supports">
                  <span>Supports:</span>
                  {['.py', '.js', '.java', '.cpp', '.c', '.json', '.yml', '.yaml', '+ more'].map((ext) => (
                    <span key={ext} className="chip">{ext}</span>
                  ))}
                </div>

                {error && <div className="scan-error"><AlertTriangle size={14} /> {error}</div>}

                <button className="scan-btn" onClick={handleScan} disabled={scanning || !code.trim()}>
                  <Search size={16} /> {scanning ? 'Scanning…' : 'Run Security Scan'}
                </button>
              </section>
            </div>

            <section className="panel">
              <div className="panel-head">
                <div><h2>3. Scan Configuration</h2></div>
              </div>
              <div className="check-list">
                {CHECK_ITEMS.map((c) => (
                  <label className="check-row" key={c.key}>
                    <input type="checkbox" checked={checks[c.key]} onChange={() => toggleCheck(c.key)} />
                    <div>
                      <div className="check-title">{c.title}</div>
                      <div className="check-desc">{c.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="field-row" style={{ marginTop: '12px' }}>
                <span className="field-label">Analysis Depth</span>
              </div>
              <select className="code-input" style={{ height: 'auto', padding: '8px 12px' }} value={analysisDepth} onChange={(e) => setAnalysisDepth(e.target.value)}>
                <option value="quick">Quick</option>
                <option value="standard">Standard (Recommended)</option>
                <option value="deep">Deep</option>
              </select>
            </section>
          </div>

          <section className="panel" style={{ marginTop: '14px' }}>
            <div className="panel-head">
              <div><h2>4. Security Checks ({CAPABILITY_TILES.length} capabilities)</h2></div>
            </div>
            <div className="dash-cap-grid">
              {CAPABILITY_TILES.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <div className="dash-cap-card" key={cap.key}>
                    <div className="dash-cap-icon"><Icon size={14} /></div>
                    <div className="dash-cap-title">{cap.label}</div>
                    <div className="dash-cap-status" style={{ color: '#4fd08a' }}>Enabled</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="content-grid" style={{ marginTop: '14px' }}>
            <section className="panel">
              <div className="panel-head"><div><h2>5. Analysis Pipeline</h2></div></div>
              <div className="pipeline-row">
                {PIPELINE_STEPS.map((step) => {
                  const Icon = step.icon;
                  const state = pipelineState === 'done' ? 'done' : pipelineState === 'running' ? 'running' : 'idle';
                  return (
                    <div className="pipeline-step" key={step.key}>
                      <div className={`pipeline-dot ${state}`}>
                        {state === 'done' ? <Check size={14} /> : <Icon size={14} />}
                      </div>
                      <div className="pipeline-label">{step.label}</div>
                      <div className={`pipeline-status ${state}`}>
                        {state === 'done' ? 'Complete' : state === 'running' ? 'Running…' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {results && (
                <div className="pipeline-complete">
                  <CheckCircle2 size={20} className="empty-icon success" />
                  <div>
                    <div className="settings-label" style={{ fontSize: '13.5px' }}>Analysis complete</div>
                    <div className="settings-sub">
                      Scan finished in {scanDurationMs !== null ? (scanDurationMs / 1000).toFixed(2) : '—'}s
                    </div>
                  </div>
                </div>
              )}
              {!results && !scanning && (
                <p className="empty-sub" style={{ marginTop: '10px' }}>Run a scan to see pipeline progress here.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div><h2>6. Scan Summary</h2></div>
                {results && <span className="results-badge" style={{ background: '#12301f', color: '#4fd08a' }}>Completed</span>}
              </div>

              {!results && (
                <p className="empty-sub">Results will appear here once you run a scan.</p>
              )}

              {results && (
                <>
                  <div className="summary-row">
                    <div className="summary-chip" style={CRITICAL_FALLBACK}>{results.critical ?? 0}<br />Critical</div>
                    <div className="summary-chip sev-high">{results.highSeverity ?? 0}<br />High</div>
                    <div className="summary-chip sev-medium">{results.mediumSeverity ?? 0}<br />Medium</div>
                    <div className="summary-chip sev-low">{results.lowSeverity ?? 0}<br />Low</div>
                  </div>
                  <div className="dash-stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '12px' }}>
                    <div className="dash-stat-card">
                      <div className="dash-stat-head">Risk Score</div>
                      <div className="dash-stat-value">{results.riskScore ?? 0}<span> / 100</span></div>
                      <div className="dash-stat-sub" style={{ color: '#e8a33d' }}>{results.riskLevel}</div>
                    </div>
                    <div className="dash-stat-card">
                      <div className="dash-stat-head">AI Confidence</div>
                      <div className="dash-stat-value">{aiConfidence !== null ? `${aiConfidence}%` : '—'}</div>
                      <div className="dash-stat-sub" style={{ color: '#4fd08a' }}>{aiConfidence !== null ? 'High confidence' : 'No AI findings'}</div>
                    </div>
                  </div>
                  <button className="scan-btn" style={{ marginTop: '12px' }} onClick={() => goToNav('Scan Results')}>
                    View Detailed Results <ChevronRight size={16} />
                  </button>
                </>
              )}
            </section>
          </div>
          </>
          );
        })()}
      </main>
    </div>
  );
}