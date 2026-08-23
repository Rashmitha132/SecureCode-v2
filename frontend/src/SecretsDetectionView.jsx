// SecretsDetectionView.jsx — redesigned to match Code Scan / Generate Code aesthetic
import { useState } from 'react';
import { KeyRound, Zap, AlertTriangle, Eye, EyeOff, Copy, Check, ShieldAlert, Lock } from 'lucide-react';

function isSecretFinding(f) {
  const type = (f.type || '').toLowerCase();
  const cat  = (f.category || '').toLowerCase();
  return (
    f.method === 'entropy' ||
    cat.includes('secret') ||
    type.includes('secret') || type.includes('key') || type.includes('token') ||
    type.includes('password') || type.includes('credential') || type.includes('api') ||
    type.includes('private') || type.includes('auth') && type.includes('hard')
  );
}

function maskPreview(str = '') {
  if (!str) return '—';
  if (str.length <= 8) return '••••••••';
  return str.slice(0, 6) + '•••••••' + str.slice(-3);
}

function filterByType(findings, chip) {
  if (chip === 'all') return findings;
  if (chip === 'apikey') return findings.filter(f => {
    const t = (f.type || '').toLowerCase();
    return t.includes('api') || t.includes('key');
  });
  if (chip === 'token') return findings.filter(f => (f.type || '').toLowerCase().includes('token'));
  if (chip === 'password') return findings.filter(f => {
    const t = (f.type || '').toLowerCase();
    return t.includes('password') || t.includes('credential') || t.includes('secret');
  });
  if (chip === 'entropy') return findings.filter(f => f.method === 'entropy');
  return findings;
}

export default function SecretsDetectionView({ results, code, scanDurationMs }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [revealedRows, setRevealedRows] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);

  const allFindings = results?.findings || [];
  const secretFindings = allFindings.filter(isSecretFinding);
  const hasData = Boolean(results);

  const filtered = filterByType(secretFindings, activeFilter);

  const highestSev = (() => {
    if (secretFindings.some(f => (f.severity || '').toLowerCase() === 'critical')) return { label: 'Critical', color: '#ef4444' };
    if (secretFindings.some(f => (f.severity || '').toLowerCase() === 'high'))     return { label: 'High',     color: '#f97316' };
    if (secretFindings.some(f => (f.severity || '').toLowerCase() === 'medium'))   return { label: 'Medium',   color: '#f59e0b' };
    if (secretFindings.length > 0) return { label: 'Low', color: '#3b82f6' };
    return { label: 'None', color: '#10b981' };
  })();

  const avgConf = secretFindings.length
    ? Math.round(secretFindings.reduce((s, f) => s + (typeof f.confidence === 'number' ? f.confidence : 0.5), 0) / secretFindings.length * 100)
    : 0;

  const uniqueLines = new Set(secretFindings.map(f => f.line).filter(Boolean)).size;

  const SEV_CLASS = { critical: 'v2-badge-critical', high: 'v2-badge-high', medium: 'v2-badge-medium', low: 'v2-badge-low' };
  const sevClass = (sev = '') => SEV_CLASS[(sev || '').toLowerCase()] || 'v2-badge-low';

  const critical = secretFindings.filter(f => (f.severity || '').toLowerCase() === 'critical' || (f.severity || '').toLowerCase() === 'high');
  const medium   = secretFindings.filter(f => (f.severity || '').toLowerCase() === 'medium');
  const low      = secretFindings.filter(f => (f.severity || '').toLowerCase() === 'low');

  function handleCopy(text, idx) {
    navigator.clipboard?.writeText(text || '').then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  return (
    <div className="v2-results-wrapper">
      {/* Header */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Zap size={13} className="v2-tag-icon" />
            <span>Entropy &amp; Pattern Analysis</span>
          </div>
          <h1>Secrets Detection</h1>
          <p className="hide-on-mobile">High-entropy strings, hardcoded credentials, and exposed API keys found in your code.</p>
        </div>
      </header>

      {!hasData ? (
        <div className="v2-panel">
          <div className="v2-empty-state">
            <KeyRound size={36} style={{ color: '#f59e0b' }} />
            <div className="v2-empty-title">Run a scan to detect secrets</div>
            <div className="v2-empty-desc">Paste your source code into Code Scan and run it to find hardcoded credentials and high-entropy strings.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <section className="v2-metrics-grid">
            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Secrets Found</span>
                <div className="v2-metric-icon v2-icon-red"><KeyRound size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: secretFindings.length > 0 ? '#ef4444' : '#10b981' }}>{secretFindings.length}</span></div>
                <div className="v2-metric-sub">{secretFindings.length === 0 ? 'No secrets detected' : 'Requires immediate action'}</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Highest Severity</span>
                <div className="v2-metric-icon v2-icon-red"><AlertTriangle size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: highestSev.color }}>{highestSev.label}</span></div>
                <div className="v2-metric-sub">Most severe secret class</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Avg Entropy Score</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}><Zap size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{avgConf}%</span></div>
                <div className="v2-metric-sub">Detection confidence</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Lines Affected</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Lock size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{uniqueLines || '—'}</span></div>
                <div className="v2-metric-sub">Unique source lines</div>
              </div>
            </div>
          </section>

          {/* Filter chips + table */}
          <div className="v2-panel">
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { key: 'all',      label: `All (${secretFindings.length})` },
                { key: 'apikey',   label: 'API Keys' },
                { key: 'token',    label: 'Tokens' },
                { key: 'password', label: 'Passwords / Credentials' },
                { key: 'entropy',  label: 'High Entropy' },
              ].map(chip => (
                <button
                  key={chip.key}
                  className={`v2-filter-chip ${activeFilter === chip.key ? 'v2-filter-chip-active' : ''}`}
                  onClick={() => setActiveFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="v2-empty-state" style={{ padding: '32px 0' }}>
                <KeyRound size={28} style={{ color: '#10b981' }} />
                <div className="v2-empty-title" style={{ fontSize: 15 }}>No secrets detected in this scan</div>
                <div className="v2-empty-desc">Your code appears free of hardcoded credentials, API keys, and high-entropy tokens.</div>
              </div>
            ) : (
              <div className="v2-table-responsive">
                <table className="v2-findings-table">
                  <thead>
                    <tr>
                      <th>Secret Type</th>
                      <th style={{ width: 90 }}>Severity</th>
                      <th style={{ width: 70 }}>Line</th>
                      <th>Match Preview</th>
                      <th style={{ width: 100 }}>Confidence</th>
                      <th style={{ width: 90 }}>Engine</th>
                      <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f, i) => {
                      const isRevealed = revealedRows[i];
                      const preview = f.matchPreview || '';
                      const conf = typeof f.confidence === 'number' ? Math.round(f.confidence * 100) : 50;
                      return (
                        <tr key={i} className="v2-table-row">
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{f.type || 'Unknown Secret'}</div>
                            {f.explanation && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.explanation}
                              </div>
                            )}
                          </td>
                          <td><span className={`v2-sev-badge ${sevClass(f.severity)}`}>{f.severity || 'Medium'}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.line ? `L${f.line}` : '—'}</td>
                          <td>
                            <code style={{ fontSize: 12, fontFamily: 'monospace', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                              {isRevealed ? preview : maskPreview(preview)}
                            </code>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${conf}%`, background: conf >= 80 ? '#ef4444' : '#f59e0b', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 30 }}>{conf}%</span>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                              background: f.method === 'entropy' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                              color: f.method === 'entropy' ? '#f59e0b' : '#14b8a6',
                            }}>
                              {f.method === 'entropy' ? 'Entropy' : 'Pattern'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button className="v2-icon-action-btn" onClick={() => setRevealedRows(p => ({ ...p, [i]: !p[i] }))} title={isRevealed ? 'Hide' : 'Reveal'}>
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button className="v2-icon-action-btn" onClick={() => handleCopy(preview, i)} title="Copy value">
                                {copiedIdx === i ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Remediation Triage */}
          {secretFindings.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {[
                { label: 'Rotate Immediately', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: AlertTriangle, items: critical },
                { label: 'Audit Soon',         color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Zap,           items: medium },
                { label: 'Monitor',            color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: Lock,          items: low },
              ].map(bucket => (
                <div key={bucket.label} className="v2-panel" style={{ background: bucket.bg, borderColor: bucket.color + '33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <bucket.icon size={14} style={{ color: bucket.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: bucket.color }}>{bucket.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: bucket.color }}>{bucket.items.length}</span>
                  </div>
                  {bucket.items.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>None in this category</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {bucket.items.slice(0, 4).map((f, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-dim)', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {f.type || 'Unknown'}
                        </div>
                      ))}
                      {bucket.items.length > 4 && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>+{bucket.items.length - 4} more</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
