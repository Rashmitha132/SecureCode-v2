// SecurityCoverageView.jsx — redesigned to match Code Scan / Generate Code / Scan Results aesthetic
import { useState } from 'react';
import { ShieldCheck, Brain, Zap, Search, Package, Clock, Layers, Target, ChevronRight } from 'lucide-react';

const ENGINE_CONFIG = [
  { key: 'gnn',     label: 'GNN Model',        sub: 'AST Graph Neural Network',   Icon: Brain,      color: '#c084fc', bg: 'rgba(192,132,252,0.12)', method: (f) => f.method === 'gnn' },
  { key: 'llm',     label: 'LLM Semantic',      sub: 'Groq Language Model',        Icon: Layers,     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   method: (f) => f.method === 'llm' },
  { key: 'entropy', label: 'Entropy Detector',  sub: 'Shannon Entropy Analysis',   Icon: Zap,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   method: (f) => f.method === 'entropy' },
  { key: 'pattern', label: 'Pattern / Regex',   sub: 'Rule-based Signature Scan',  Icon: Search,     color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',    method: (f) => f.method === 'pattern' || f.method === 'regex' },
  { key: 'osv',     label: 'OSV Dependency',    sub: 'OSV.dev Advisory Database',  Icon: Package,    color: '#f472b6', bg: 'rgba(244,114,182,0.12)',   method: (f) => f.method === 'osv' || f.category === 'Dependency' },
];

const CATEGORIES = [
  'Injection', 'Broken Authentication', 'Access Control',
  'Insecure Configuration', 'Logic Error', 'Secrets', 'Dependencies',
];

function categoryOf(f) {
  const cat = (f.category || '').toLowerCase();
  const type = (f.type || '').toLowerCase();
  if (cat.includes('inject') || type.includes('inject') || type.includes('sql') || type.includes('xss')) return 'Injection';
  if (cat.includes('auth') || type.includes('auth') || type.includes('session') || type.includes('credential')) return 'Broken Authentication';
  if (cat.includes('access') || type.includes('access') || type.includes('authz') || type.includes('idor')) return 'Access Control';
  if (cat.includes('config') || type.includes('config') || type.includes('cors') || type.includes('tls') || type.includes('debug')) return 'Insecure Configuration';
  if (cat.includes('logic') || type.includes('logic') || type.includes('error')) return 'Logic Error';
  if (cat.includes('secret') || type.includes('secret') || type.includes('key') || type.includes('token') || f.method === 'entropy') return 'Secrets';
  if (cat.includes('dep') || type.includes('package') || f.method === 'osv') return 'Dependencies';
  return 'Logic Error';
}

function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SecurityCoverageView({ results, code, scanDurationMs }) {
  const findings = results?.findings || [];
  const hasData = Boolean(results);

  const totalIssues = findings.length;
  const securityScore = Math.max(0, 100 - (results?.riskScore ?? 0));
  const scoreColor = securityScore >= 80 ? '#10b981' : securityScore >= 60 ? '#f59e0b' : '#ef4444';

  // Engine counts
  const engineCounts = {};
  for (const eng of ENGINE_CONFIG) {
    engineCounts[eng.key] = findings.filter(eng.method).length;
  }

  // Category breakdown
  const catCounts = {};
  for (const cat of CATEGORIES) catCounts[cat] = 0;
  for (const f of findings) {
    const cat = categoryOf(f);
    if (catCounts[cat] !== undefined) catCounts[cat]++;
  }
  const maxCat = Math.max(1, ...Object.values(catCounts));

  // Method distribution
  const methodDist = ENGINE_CONFIG.map(eng => ({
    label: eng.label,
    color: eng.color,
    count: engineCounts[eng.key],
    pct: totalIssues ? Math.round((engineCounts[eng.key] / totalIssues) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="v2-results-wrapper">
      {/* Header */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <ShieldCheck size={13} className="v2-tag-icon" />
            <span>Coverage &amp; Detection Map</span>
          </div>
          <h1>Security Coverage</h1>
          <p className="hide-on-mobile">What SecureCode checks on every scan and what your last scan found across all 5 detection engines.</p>
        </div>
      </header>

      {!hasData ? (
        <div className="v2-panel">
          <div className="v2-empty-state">
            <ShieldCheck size={36} style={{ color: '#c084fc' }} />
            <div className="v2-empty-title">Run a scan to see coverage</div>
            <div className="v2-empty-desc">Coverage is based on your most recent scan from Code Scan.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <section className="v2-metrics-grid">
            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Total Issues Found</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <Target size={16} />
                </div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{totalIssues}</span></div>
                <div className="v2-metric-sub">{results?.riskLevel || 'Low'} Risk</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Security Score</span>
                <div className="v2-metric-icon v2-icon-green"><ShieldCheck size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: scoreColor }}>{securityScore}/100</span></div>
                <div className="v2-metric-sub">{securityScore >= 80 ? 'Good posture' : securityScore >= 60 ? 'Moderate risk' : 'Action needed'}</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Scan Duration</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <Clock size={16} />
                </div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{formatDuration(scanDurationMs)}</span></div>
                <div className="v2-metric-sub">Multi-engine parallel scan</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Detection Engines</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc' }}>
                  <Layers size={16} />
                </div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>5</span></div>
                <div className="v2-metric-sub">GNN · LLM · Entropy · Regex · OSV</div>
              </div>
            </div>
          </section>

          {/* Engine Coverage Matrix */}
          <div className="v2-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Layers size={16} style={{ color: '#c084fc' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Engine Coverage Matrix</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>All 5 engines ran in parallel</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ENGINE_CONFIG.map(eng => {
                const count = engineCounts[eng.key];
                return (
                  <div key={eng.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: eng.bg, color: eng.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <eng.Icon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{eng.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{eng.sub}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: eng.color, background: eng.bg, padding: '3px 10px', borderRadius: 20 }}>
                      Active
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: 'right', color: count > 0 ? '#ef4444' : '#10b981' }}>
                      {count} finding{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="v2-panel">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Category Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATEGORIES.map(cat => {
                const count = catCounts[cat] || 0;
                const pct = Math.round((count / maxCat) * 100);
                return (
                  <div key={cat} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{cat}</span>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: count > 0 ? '#c084fc' : 'transparent', borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', color: count > 0 ? 'var(--text)' : 'var(--text-dim)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Method Distribution Table */}
          <div className="v2-panel">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Detection Engine Performance</div>
            <div className="v2-table-responsive">
              <table className="v2-findings-table">
                <thead>
                  <tr>
                    <th>Engine</th>
                    <th style={{ width: 100 }}>Findings</th>
                    <th style={{ width: 120 }}>% of Total</th>
                    <th style={{ width: 200 }}>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {methodDist.map(m => (
                    <tr key={m.label} className="v2-table-row">
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td style={{ fontWeight: 700, color: m.count > 0 ? '#ef4444' : '#10b981' }}>{m.count}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{m.pct}%</td>
                      <td>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${m.pct}%`, background: m.color, borderRadius: 3 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
