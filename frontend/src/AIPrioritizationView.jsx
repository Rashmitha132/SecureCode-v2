// AIPrioritizationView.jsx — redesigned to match Code Scan / Generate Code aesthetic
import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Zap, Target, TrendingUp, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';

const SEV_WEIGHT = { critical: 10, high: 7, medium: 4, low: 1 };
const SEV_CLASS  = { critical: 'v2-badge-critical', high: 'v2-badge-high', medium: 'v2-badge-medium', low: 'v2-badge-low' };

function priorityScore(f) {
  const w = SEV_WEIGHT[(f.severity || '').toLowerCase()] ?? 1;
  const c = typeof f.confidence === 'number' ? f.confidence : 0.5;
  return w * c;
}

function engineBadge(method) {
  const m = (method || '').toLowerCase();
  if (m === 'gnn')     return { label: 'GNN Model',     color: '#c084fc', bg: 'rgba(192,132,252,0.12)' };
  if (m === 'llm')     return { label: 'LLM Analysis',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  };
  if (m === 'entropy') return { label: 'Entropy Check', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  };
  if (m === 'osv')     return { label: 'OSV Advisory',  color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
  return                      { label: 'Pattern Match', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  };
}

function priorityLabel(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return { label: 'URGENT',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (s === 'high')     return { label: 'HIGH',     color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  if (s === 'medium')   return { label: 'MODERATE', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  return                       { label: 'LOW',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
}

export default function AIPrioritizationView({ results, history }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const findings  = results?.findings || [];
  const hasData   = Boolean(results);

  // Sort all findings by priority score descending
  const ranked = [...findings]
    .map((f, i) => ({ ...f, _origIdx: i, _score: priorityScore(f) }))
    .sort((a, b) => b._score - a._score);

  const totalIssues  = ranked.length;
  const urgentCount  = ranked.filter(f => ['critical', 'high'].includes((f.severity || '').toLowerCase())).length;
  const avgConfidence = totalIssues
    ? Math.round(ranked.reduce((s, f) => s + (typeof f.confidence === 'number' ? f.confidence : 0.5), 0) / totalIssues * 100)
    : 0;

  // Top risk category
  const catCounts = {};
  for (const f of ranked) {
    const k = f.category || 'Other';
    catCounts[k] = (catCounts[k] || 0) + 1;
  }
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // Roadmap buckets
  const roadmap = [
    { step: 1, label: 'Fix All Critical',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  items: ranked.filter(f => (f.severity || '').toLowerCase() === 'critical') },
    { step: 2, label: 'Fix All High',      color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', items: ranked.filter(f => (f.severity || '').toLowerCase() === 'high') },
    { step: 3, label: 'Review Medium',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', items: ranked.filter(f => (f.severity || '').toLowerCase() === 'medium') },
    { step: 4, label: 'Monitor Low',       color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', items: ranked.filter(f => (f.severity || '').toLowerCase() === 'low') },
  ];

  return (
    <div className="v2-results-wrapper">
      {/* ── Header ── */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Brain size={13} className="v2-tag-icon" />
            <span>GNN + LLM Risk Engine</span>
          </div>
          <h1>AI Prioritization</h1>
          <p className="hide-on-mobile">Issues ranked by exploitability and business impact using the GNN model and LLM semantic analysis.</p>
        </div>
      </header>

      {!hasData ? (
        <div className="v2-panel">
          <div className="v2-empty-state">
            <Brain size={36} style={{ color: '#c084fc' }} />
            <div className="v2-empty-title">Run a scan to see AI-ranked priorities</div>
            <div className="v2-empty-desc">The GNN model and LLM will rank all detected issues by exploitability and impact.</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Metric Cards ── */}
          <section className="v2-metrics-grid">
            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Total Issues Ranked</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc' }}><Layers size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{totalIssues}</span></div>
                <div className="v2-metric-sub">Sorted by AI priority score</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Immediate Action</span>
                <div className="v2-metric-icon v2-icon-red"><ShieldAlert size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value">
                  <span style={{ color: urgentCount > 0 ? '#ef4444' : '#10b981' }}>{urgentCount}</span>
                </div>
                <div className="v2-metric-sub">Critical + High severity</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">AI Confidence Avg</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><TrendingUp size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{avgConfidence}%</span></div>
                <div className="v2-metric-sub">GNN + LLM model confidence</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Top Risk Category</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}><Target size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value" style={{ fontSize: 14 }}>
                  <span style={{ fontSize: totalIssues > 0 ? 14 : 24 }}>{topCategory}</span>
                </div>
                <div className="v2-metric-sub">Most frequently detected</div>
              </div>
            </div>
          </section>

          {/* ── Ranked Fix Queue ── */}
          {ranked.length === 0 ? (
            <div className="v2-panel">
              <div className="v2-empty-state" style={{ padding: '28px 0' }}>
                <CheckCircle2 size={30} style={{ color: '#10b981' }} />
                <div className="v2-empty-title">No issues to prioritize</div>
                <div className="v2-empty-desc">Your last scan found no vulnerabilities. Keep it clean!</div>
              </div>
            </div>
          ) : (
            <div className="v2-panel">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={15} style={{ color: '#c084fc' }} />
                Ranked Fix Queue
                <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto', fontWeight: 400 }}>
                  Score = Severity × Confidence
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ranked.map((f, i) => {
                  const prio  = priorityLabel(f.severity);
                  const eng   = engineBadge(f.method);
                  const conf  = typeof f.confidence === 'number' ? Math.round(f.confidence * 100) : 50;
                  const isOpen = expandedIdx === i;

                  return (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isOpen ? 'rgba(192,132,252,0.3)' : 'var(--border)'}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      onClick={() => setExpandedIdx(isOpen ? null : i)}
                    >
                      {/* Row header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                        {/* Rank number */}
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: i === 0 ? 'rgba(239,68,68,0.15)' : i === 1 ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.05)',
                          color: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : 'var(--text-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 12,
                        }}>
                          #{i + 1}
                        </div>

                        {/* Priority badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em',
                          background: prio.bg, color: prio.color, flexShrink: 0,
                        }}>
                          {prio.label}
                        </span>

                        {/* Issue info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.type || 'Unspecified Issue'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {f.category || 'Logic Error'}
                            {f.line ? ` · Line ${f.line}` : ''}
                          </div>
                        </div>

                        {/* Engine badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: eng.bg, color: eng.color, flexShrink: 0, display: 'none',
                        }} className="v2-engine-badge-desktop">
                          {eng.label}
                        </span>

                        {/* Confidence bar */}
                        <div style={{ width: 80, flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textAlign: 'right' }}>{conf}%</div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${conf}%`, background: prio.color, borderRadius: 2 }} />
                          </div>
                        </div>

                        {/* Expand chevron */}
                        {isOpen
                          ? <ChevronDown size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                          : <ChevronRight size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        }
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: eng.bg, color: eng.color }}>
                              {eng.label}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                              Score: {f._score.toFixed(1)}
                            </span>
                          </div>
                          {f.explanation && (
                            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Why it matters:</strong>
                              {f.explanation}
                            </div>
                          )}
                          {f.fix && (
                            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                              <strong style={{ color: '#10b981', display: 'block', marginBottom: 4 }}>Suggested Fix:</strong>
                              {f.fix}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Fix Roadmap ── */}
          {ranked.length > 0 && (
            <div className="v2-panel">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={15} style={{ color: '#10b981' }} />
                Remediation Roadmap
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roadmap.map(step => (
                  <div key={step.step} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    background: step.bg, border: `1px solid ${step.border}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: step.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12,
                    }}>
                      {step.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: step.color }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {step.items.length === 0
                          ? 'None in this category — ✅'
                          : `${step.items.length} issue${step.items.length !== 1 ? 's' : ''}: ${step.items.slice(0, 3).map(f => f.type || 'Issue').join(', ')}${step.items.length > 3 ? ` +${step.items.length - 3} more` : ''}`
                        }
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: step.items.length > 0 ? step.color : '#10b981' }}>
                      {step.items.length > 0 ? step.items.length : '✓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Model Info Footer ── */}
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.2)',
            display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={14} style={{ color: '#c084fc' }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--text)' }}>GNN Model:</strong> gnn_v2.pt · 88.0% accuracy
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--text)' }}>LLM:</strong> Groq semantic analysis · Active
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--text)' }}>Priority Score:</strong> Severity × Confidence
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
