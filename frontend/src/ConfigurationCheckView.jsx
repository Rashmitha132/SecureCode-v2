// ConfigurationCheckView.jsx — redesigned to match Code Scan / Generate Code aesthetic
import { useState } from 'react';
import { Settings, CheckCircle2, XCircle, AlertTriangle, Copy, Check, Sliders, ShieldAlert } from 'lucide-react';

function isConfigFinding(f) {
  const cat  = (f.category || '').toLowerCase();
  const type = (f.type || '').toLowerCase();
  return (
    cat.includes('config') || cat.includes('insecure config') ||
    type.includes('config') || type.includes('cors') || type.includes('tls') ||
    type.includes('ssl') || type.includes('https') || type.includes('debug') ||
    type.includes('error') && (type.includes('leak') || type.includes('handl') || type.includes('expos')) ||
    type.includes('header') || type.includes('csp') || type.includes('verbose')
  );
}

const OWASP_RULES = [
  { id: 'cors',    label: 'CORS Policy',             sub: 'Restrictive cross-origin settings',  matchType: (t) => t.includes('cors') },
  { id: 'debug',   label: 'Debug Mode Disabled',     sub: 'No debug flags in production',        matchType: (t) => t.includes('debug') },
  { id: 'tls',     label: 'TLS / HTTPS Enforced',    sub: 'All connections over secure channel', matchType: (t) => t.includes('tls') || t.includes('ssl') || t.includes('https') },
  { id: 'error',   label: 'Error Handling',          sub: 'No stack traces exposed to client',   matchType: (t) => t.includes('error') || t.includes('verbose') || t.includes('leak') },
  { id: 'header',  label: 'Security Headers',        sub: 'X-Frame-Options, HSTS, CSP',          matchType: (t) => t.includes('header') },
  { id: 'secret',  label: 'No Secrets in Config',    sub: 'No hardcoded keys in config files',   matchType: (t) => t.includes('secret') || t.includes('key') || t.includes('credential') },
  { id: 'rate',    label: 'Rate Limiting',           sub: 'Manual verification recommended',     manual: true },
  { id: 'csp',     label: 'CSP Headers',             sub: 'Content Security Policy headers',     manual: true },
];

const SEV_CLASS = { critical: 'v2-badge-critical', high: 'v2-badge-high', medium: 'v2-badge-medium', low: 'v2-badge-low' };
const sevClass = (sev = '') => SEV_CLASS[(sev || '').toLowerCase()] || 'v2-badge-low';

const QUICK_FIXES = [
  { title: 'Disable Debug in Production', code: 'DEBUG = False  # Never True in prod', color: '#c084fc' },
  { title: 'Restrict CORS Origins', code: "CORS_ORIGINS = ['https://yourdomain.com']", color: '#3b82f6' },
  { title: 'Enforce HTTPS / TLS', code: 'SECURE_SSL_REDIRECT = True\nSECURE_HSTS_SECONDS = 31536000', color: '#10b981' },
  { title: 'Generic Error Responses', code: 'app.use((err, req, res) => res.status(500).json({ error: "Server error" }))', color: '#f59e0b' },
];

export default function ConfigurationCheckView({ results, code, scanDurationMs }) {
  const [copiedFix, setCopiedFix] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const allFindings = results?.findings || [];
  const configFindings = allFindings.filter(isConfigFinding);
  const hasData = Boolean(results);

  const critical = configFindings.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
  const high     = configFindings.filter(f => (f.severity || '').toLowerCase() === 'high').length;

  // Top config category
  const typeCounts = {};
  for (const f of configFindings) {
    const k = (f.type || 'Other');
    typeCounts[k] = (typeCounts[k] || 0) + 1;
  }
  const topCategory = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // OWASP rule evaluation
  function ruleStatus(rule) {
    if (rule.manual) return 'manual';
    const hit = configFindings.some(f => rule.matchType((f.type || '').toLowerCase()));
    return hit ? 'fail' : 'pass';
  }

  function handleCopyFix(code, idx) {
    navigator.clipboard?.writeText(code || '').then(() => {
      setCopiedFix(idx);
      setTimeout(() => setCopiedFix(null), 2000);
    });
  }

  return (
    <div className="v2-results-wrapper">
      {/* Header */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Sliders size={13} className="v2-tag-icon" />
            <span>Config Risk Analysis</span>
          </div>
          <h1>Configuration Check</h1>
          <p className="hide-on-mobile">Insecure configuration patterns detected across CORS, TLS, debug settings, and error handling.</p>
        </div>
      </header>

      {!hasData ? (
        <div className="v2-panel">
          <div className="v2-empty-state">
            <Settings size={36} style={{ color: '#14b8a6' }} />
            <div className="v2-empty-title">Run a scan to check configuration</div>
            <div className="v2-empty-desc">Paste your source code into Code Scan to detect insecure configuration patterns.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <section className="v2-metrics-grid">
            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Config Issues</span>
                <div className="v2-metric-icon v2-icon-red"><ShieldAlert size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: configFindings.length > 0 ? '#ef4444' : '#10b981' }}>{configFindings.length}</span></div>
                <div className="v2-metric-sub">{configFindings.length === 0 ? 'Config looks clean' : 'Require remediation'}</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Critical / High</span>
                <div className="v2-metric-icon v2-icon-red"><AlertTriangle size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: (critical + high) > 0 ? '#ef4444' : '#10b981' }}>{critical + high}</span></div>
                <div className="v2-metric-sub">Immediate action required</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Top Risk Category</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}><Sliders size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value" style={{ fontSize: configFindings.length > 0 ? 16 : 24 }}>
                  <span style={{ fontSize: configFindings.length > 0 ? 14 : 24 }}>{topCategory}</span>
                </div>
                <div className="v2-metric-sub">Most common config issue</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">OWASP Rules Passed</span>
                <div className="v2-metric-icon v2-icon-green"><CheckCircle2 size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value">
                  <span style={{ color: '#10b981' }}>
                    {OWASP_RULES.filter(r => ruleStatus(r) === 'pass').length}/{OWASP_RULES.filter(r => !r.manual).length}
                  </span>
                </div>
                <div className="v2-metric-sub">Automated rule checks</div>
              </div>
            </div>
          </section>

          {/* OWASP Rule Checklist */}
          <div className="v2-panel">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>OWASP Configuration Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OWASP_RULES.map(rule => {
                const status = ruleStatus(rule);
                return (
                  <div key={rule.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: status === 'pass' ? 'rgba(16,185,129,0.05)' : status === 'fail' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${status === 'pass' ? 'rgba(16,185,129,0.2)' : status === 'fail' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                  }}>
                    {status === 'pass' && <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
                    {status === 'fail' && <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />}
                    {status === 'manual' && <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{rule.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rule.sub}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: status === 'pass' ? 'rgba(16,185,129,0.15)' : status === 'fail' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: status === 'pass' ? '#10b981' : status === 'fail' ? '#ef4444' : '#f59e0b',
                    }}>
                      {status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'Manual Check'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Config Findings Table */}
          {configFindings.length > 0 && (
            <div className="v2-panel">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Configuration Findings</div>
              <div className="v2-table-responsive">
                <table className="v2-findings-table">
                  <thead>
                    <tr>
                      <th>Issue Type</th>
                      <th style={{ width: 90 }}>Severity</th>
                      <th style={{ width: 60 }}>Line</th>
                      <th>Explanation</th>
                      <th style={{ width: 80, textAlign: 'right' }}>Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configFindings.map((f, i) => (
                      <>
                        <tr key={i} className="v2-table-row" style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{f.type || 'Config Issue'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{f.category}</div>
                          </td>
                          <td><span className={`v2-sev-badge ${sevClass(f.severity)}`}>{f.severity || 'Medium'}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.line ? `L${f.line}` : '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 260 }}>
                            {(f.explanation || '').slice(0, 90)}{f.explanation?.length > 90 ? '…' : ''}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="v2-icon-action-btn" onClick={e => { e.stopPropagation(); handleCopyFix(f.fix, i); }}>
                              {copiedFix === i ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === i && f.fix && (
                          <tr key={`${i}-expand`}>
                            <td colSpan={5} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 16px' }}>
                              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>Suggested Fix:</div>
                              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>{f.fix}</div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {configFindings.length === 0 && (
            <div className="v2-panel">
              <div className="v2-empty-state" style={{ padding: '28px 0' }}>
                <CheckCircle2 size={30} style={{ color: '#10b981' }} />
                <div className="v2-empty-title">No configuration issues detected</div>
                <div className="v2-empty-desc">Your code follows secure configuration practices.</div>
              </div>
            </div>
          )}

          {/* Quick Fix Guide */}
          <div className="v2-panel">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Quick Fix Reference</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {QUICK_FIXES.map((fix, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: fix.color, marginBottom: 8 }}>{fix.title}</div>
                  <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-dim)', display: 'block', whiteSpace: 'pre-wrap' }}>{fix.code}</code>
                  <button className="v2-btn-secondary" style={{ marginTop: 10, padding: '4px 10px', fontSize: 11 }} onClick={() => handleCopyFix(fix.code, `qf${i}`)}>
                    {copiedFix === `qf${i}` ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
