// DependencyCheckView.jsx — redesigned to match Code Scan / Generate Code aesthetic
import { useState } from 'react';
import { Package, AlertTriangle, CheckCircle2, ExternalLink, ChevronDown, ChevronRight, ShieldAlert, ArrowUpRight } from 'lucide-react';

function parsePackageJsonClientSide(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
    const names = Object.keys(deps);
    return names.length > 0 ? names : null;
  } catch { return null; }
}

function isDepFinding(f) {
  return (
    f.method === 'osv' ||
    (f.category || '').toLowerCase().includes('dep') ||
    Boolean(f.packageName) ||
    (f.type || '').toLowerCase().includes('package')
  );
}

function formatDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

const SEV_CLASS = { critical: 'v2-badge-critical', high: 'v2-badge-high', medium: 'v2-badge-medium', low: 'v2-badge-low' };
const sevClass = (sev = '') => SEV_CLASS[(sev || '').toLowerCase()] || 'v2-badge-low';

export default function DependencyCheckView({ results, code }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);

  const allFindings = results?.findings || [];
  const depFindings = allFindings.filter(isDepFinding);
  const hasData = Boolean(results);

  const allPackageNames = parsePackageJsonClientSide(code);
  const vulnerablePackages = [...new Set(depFindings.map(f => f.packageName).filter(Boolean))];
  const totalPackages = allPackageNames ? allPackageNames.length : null;
  const safePackages = totalPackages !== null ? Math.max(0, totalPackages - vulnerablePackages.length) : null;
  const healthPct = totalPackages
    ? Math.round((safePackages / totalPackages) * 100)
    : (hasData && depFindings.length === 0 ? 100 : null);

  const critical = depFindings.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
  const high = depFindings.filter(f => (f.severity || '').toLowerCase() === 'high').length;
  const medium = depFindings.filter(f => (f.severity || '').toLowerCase() === 'medium').length;
  const low = depFindings.filter(f => (f.severity || '').toLowerCase() === 'low').length;

  function filterFindings() {
    if (activeFilter === 'all') return depFindings;
    if (activeFilter === 'critical') return depFindings.filter(f => (f.severity || '').toLowerCase() === 'critical');
    if (activeFilter === 'high')     return depFindings.filter(f => (f.severity || '').toLowerCase() === 'high');
    if (activeFilter === 'medium')   return depFindings.filter(f => (f.severity || '').toLowerCase() === 'medium');
    if (activeFilter === 'low')      return depFindings.filter(f => (f.severity || '').toLowerCase() === 'low');
    return depFindings;
  }
  const filtered = filterFindings();

  // Per-package bar chart
  const byPackage = vulnerablePackages.map(name => ({
    name,
    count: depFindings.filter(f => f.packageName === name).length,
    worst: [...depFindings].filter(f => f.packageName === name)
      .sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return (o[(a.severity||'').toLowerCase()] ?? 4) - (o[(b.severity||'').toLowerCase()] ?? 4); })[0]?.severity,
  })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...byPackage.map(p => p.count));

  return (
    <div className="v2-results-wrapper">
      {/* Header */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Package size={13} className="v2-tag-icon" />
            <span>OSV.dev Advisory Scanner</span>
          </div>
          <h1>Dependency Check</h1>
          <p className="hide-on-mobile">Known vulnerabilities in your package dependencies, checked live against the OSV.dev advisory database.</p>
        </div>
      </header>

      {!hasData ? (
        <div className="v2-panel">
          <div className="v2-empty-state">
            <Package size={36} style={{ color: '#f472b6' }} />
            <div className="v2-empty-title">Paste a package.json to check dependencies</div>
            <div className="v2-empty-desc">Select the Dependencies tab in Code Scan and paste your package.json to scan against OSV.dev.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <section className="v2-metrics-grid">
            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Packages Scanned</span>
                <div className="v2-metric-icon" style={{ background: 'rgba(244,114,182,0.12)', color: '#f472b6' }}><Package size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span>{totalPackages ?? '—'}</span></div>
                <div className="v2-metric-sub">From package.json</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Vulnerable Packages</span>
                <div className="v2-metric-icon v2-icon-red"><AlertTriangle size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span style={{ color: vulnerablePackages.length > 0 ? '#ef4444' : '#10b981' }}>{vulnerablePackages.length}</span></div>
                <div className="v2-metric-sub">{vulnerablePackages.length === 0 ? 'None detected' : `${depFindings.length} advisories`}</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Safe Packages</span>
                <div className="v2-metric-icon v2-icon-green"><CheckCircle2 size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value"><span className="v2-val-green">{safePackages ?? '—'}</span></div>
                <div className="v2-metric-sub">No known CVEs</div>
              </div>
            </div>

            <div className="v2-metric-card">
              <div className="v2-metric-header">
                <span className="v2-metric-label">Dependency Health</span>
                <div className="v2-metric-icon v2-icon-green"><ShieldAlert size={16} /></div>
              </div>
              <div className="v2-metric-body">
                <div className="v2-metric-value">
                  <span style={{ color: (healthPct ?? 0) >= 80 ? '#10b981' : (healthPct ?? 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {healthPct !== null ? `${healthPct}%` : '—'}
                  </span>
                </div>
                <div className="v2-metric-sub">{healthPct === null ? 'Paste package.json' : healthPct >= 80 ? 'Good' : healthPct >= 50 ? 'Moderate' : 'Poor'}</div>
              </div>
            </div>
          </section>

          {/* Per-package chart */}
          {byPackage.length > 0 && (
            <div className="v2-panel">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Vulnerabilities by Package</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {byPackage.map(pkg => {
                  const pct = Math.round((pkg.count / maxCount) * 100);
                  const color = sevClass(pkg.worst);
                  const barColor = color === 'v2-badge-critical' ? '#ef4444' : color === 'v2-badge-high' ? '#f97316' : color === 'v2-badge-medium' ? '#f59e0b' : '#3b82f6';
                  return (
                    <div key={pkg.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 50px', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{pkg.name}</span>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', color: barColor }}>{pkg.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter chips + Advisory Table */}
          <div className="v2-panel">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { key: 'all',      label: `All (${depFindings.length})` },
                { key: 'critical', label: `Critical (${critical})` },
                { key: 'high',     label: `High (${high})` },
                { key: 'medium',   label: `Medium (${medium})` },
                { key: 'low',      label: `Low (${low})` },
              ].map(chip => (
                <button key={chip.key} className={`v2-filter-chip ${activeFilter === chip.key ? 'v2-filter-chip-active' : ''}`} onClick={() => setActiveFilter(chip.key)}>
                  {chip.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="v2-empty-state" style={{ padding: '28px 0' }}>
                <CheckCircle2 size={30} style={{ color: '#10b981' }} />
                <div className="v2-empty-title">No vulnerable dependencies detected</div>
                <div className="v2-empty-desc">All packages appear clean against the OSV.dev advisory database.</div>
              </div>
            ) : (
              <>
                <div className="v2-table-responsive">
                  <table className="v2-findings-table">
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Advisory ID</th>
                        <th style={{ width: 90 }}>Severity</th>
                        <th style={{ width: 110 }}>Published</th>
                        <th style={{ width: 130 }}>Fixed Version</th>
                        <th style={{ width: 60, textAlign: 'center' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((f, i) => (
                        <>
                          <tr key={i} className="v2-table-row" style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{f.packageName || '—'}</div>
                              {f.version && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>v{f.version}</div>}
                            </td>
                            <td>
                              {f.osvUrl ? (
                                <a href={f.osvUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                                  {f.vulnId || 'View Advisory'} <ExternalLink size={11} />
                                </a>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.vulnId || 'N/A'}</span>
                              )}
                            </td>
                            <td><span className={`v2-sev-badge ${sevClass(f.severity)}`}>{f.severity || 'Unknown'}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(f.publishedDate)}</td>
                            <td>
                              {f.fixedVersion ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                                  v{f.fixedVersion}
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: '#f59e0b' }}>No patch yet</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {expandedRow === i ? <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />}
                            </td>
                          </tr>
                          {expandedRow === i && (
                            <tr key={`${i}-exp`}>
                              <td colSpan={6} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px' }}>
                                {f.explanation && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}><strong style={{ color: 'var(--text)' }}>Why it matters: </strong>{f.explanation}</div>}
                                {f.fix && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}><strong style={{ color: '#10b981' }}>Fix: </strong>{f.fix}</div>}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(59,130,246,0.07)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: 'var(--text-dim)' }}>
                  💡 <strong style={{ color: '#3b82f6' }}>Tip:</strong> Run <code style={{ fontFamily: 'monospace', color: '#3b82f6' }}>npm audit fix</code> or upgrade flagged packages to the fixed versions shown above.
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
