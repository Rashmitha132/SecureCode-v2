// ScanHistoryView.jsx
// Redesigned Scan History page matching the Linear/Vercel Dark aesthetic of Code Scan, Generate Code & Scan Results.
// Fully contained width (max-width: 1140px), metrics overview, source filters, and direct 1-click inspection into Scan Results.

import { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Code2,
  Wand2,
  RotateCcw,
  ExternalLink,
  Download,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Database,
  ArrowUpRight,
  Sparkles,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { getScanName } from './scanNameUtil';

function formatRelTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  if (isNaN(diff)) return 'Unknown';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  if (min < 43200) return `${Math.floor(min / 1440)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatExactDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ScanHistoryView({
  history = [],
  setHistory,
  historyLoading = false,
  historyError = null,
  onRefreshHistory,
  goToNav,
  setResults,
  setScanSource,
}) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Compute metrics across historical scans
  const metrics = useMemo(() => {
    if (!history || history.length === 0) {
      return { total: 0, avgScore: 0, highRiskCount: 0, cleanCount: 0 };
    }
    const total = history.length;
    const totalScore = history.reduce((acc, s) => {
      const score = Math.max(0, 100 - (s.risk_score ?? s.riskScore ?? 0));
      return acc + score;
    }, 0);
    const avgScore = Math.round(totalScore / total);
    const highRiskCount = history.filter((s) => {
      const risk = (s.risk_level || s.riskLevel || '').toLowerCase();
      return risk === 'critical' || risk === 'high';
    }).length;
    const cleanCount = history.filter((s) => {
      const findings = s.total_findings ?? s.totalFindings ?? 0;
      return findings === 0;
    }).length;

    return { total, avgScore, highRiskCount, cleanCount };
  }, [history]);

  // Filtered and sorted scans
  const filteredHistory = useMemo(() => {
    let list = [...(history || [])].sort((a, b) => {
      const tA = new Date(a.scanned_at || a.scannedAt || 0).getTime();
      const tB = new Date(b.scanned_at || b.scannedAt || 0).getTime();
      return tB - tA;
    });

    if (activeFilter === 'source') {
      list = list.filter((s) => {
        const src = (s.source_type || s.sourceType || '').toLowerCase();
        return src.includes('source') || src.includes('code') || src.includes('snippet');
      });
    } else if (activeFilter === 'generated') {
      list = list.filter((s) => {
        const src = (s.source_type || s.sourceType || '').toLowerCase();
        return src.includes('generated') || src.includes('ai');
      });
    } else if (activeFilter === 'high_risk') {
      list = list.filter((s) => {
        const risk = (s.risk_level || s.riskLevel || '').toLowerCase();
        return risk === 'critical' || risk === 'high';
      });
    } else if (activeFilter === 'clean') {
      list = list.filter((s) => (s.total_findings ?? s.totalFindings ?? 0) === 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const idStr = String(s.id || '');
        const srcStr = (s.source_type || s.sourceType || '').toLowerCase();
        const dateStr = (s.scanned_at || s.scannedAt || '').toLowerCase();
        const riskStr = (s.risk_level || s.riskLevel || '').toLowerCase();
        return idStr.includes(q) || srcStr.includes(q) || dateStr.includes(q) || riskStr.includes(q);
      });
    }

    return list;
  }, [history, activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pagedItems = filteredHistory.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function handleInspectScan(scan) {
    let parsedFindings = [];
    try {
      if (typeof scan.findings_json === 'string') {
        parsedFindings = JSON.parse(scan.findings_json);
      } else if (Array.isArray(scan.findings_json)) {
        parsedFindings = scan.findings_json;
      }
    } catch {
      parsedFindings = [];
    }

    const src = scan.source_type || scan.sourceType || 'Historical Scan';
    if (setScanSource) setScanSource(src);

    if (setResults) {
      setResults({
        findings: parsedFindings,
        riskScore: scan.risk_score ?? scan.riskScore ?? 0,
        riskLevel: scan.risk_level ?? scan.riskLevel ?? 'Low',
        scannedAt: scan.scanned_at || scan.scannedAt,
        sourceType: src,
      });
      goToNav('Scan Results');
    }
  }

  function handleToggleScanStatus(scan, e) {
    if (e) e.stopPropagation();
    const findingsCount = scan.total_findings ?? scan.totalFindings ?? (scan.findings || []).length;
    if (findingsCount === 0) return; // Clean scans have 0 issues to toggle

    const findingsList = scan.findings || [];
    const allFixed = findingsCount > 0 && findingsList.length > 0 && findingsList.every(f => f.fixed || f._fixed || f.status === 'fixed');
    const newFixedState = !allFixed;

    const updatedScan = {
      ...scan,
      findings: (findingsList.length > 0 ? findingsList : Array.from({ length: findingsCount }).map((_, idx) => ({ id: idx, type: 'Security Finding' }))).map(f => ({
        ...f,
        fixed: newFixedState,
        _fixed: newFixedState,
        status: newFixedState ? 'fixed' : 'open',
      })),
      all_fixed: newFixedState,
    };

    try {
      const cached = localStorage.getItem('sc_local_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        const idx = parsed.findIndex(s => s.id === scan.id);
        if (idx !== -1) {
          parsed[idx] = updatedScan;
        } else if (parsed.length > 0) {
          parsed[0] = updatedScan;
        }
        localStorage.setItem('sc_local_history', JSON.stringify(parsed));
      }
    } catch (err) {}

    if (setHistory) {
      setHistory(prev => (prev || []).map(s => s.id === scan.id ? updatedScan : s));
    }
  }

  function handleExportCSV() {
    if (!history.length) return;
    const header = ['Scan ID', 'Source Type', 'Risk Level', 'Risk Score', 'Total Findings', 'Scanned At'];
    const rows = history.map((s, i) => [
      s.id || i + 1,
      `"${(s.source_type || s.sourceType || 'Source Code').replace(/"/g, '""')}"`,
      s.risk_level || s.riskLevel || 'Low',
      s.risk_score ?? s.riskScore ?? 0,
      s.total_findings ?? s.totalFindings ?? 0,
      `"${s.scanned_at || s.scannedAt || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `securecode_scan_history_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleExportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `securecode_scan_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <div className="v2-results-wrapper">
      {/* ── Header matching Code Scan / Generate Code ── */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Clock size={13} className="v2-tag-icon" />
            <span>Audit Log & Registry</span>
          </div>
          <h1>Scan History</h1>
          <p className="hide-on-mobile">Searchable registry of all previous scans, security scores, and findings over time.</p>
        </div>

        <div className="v2-results-header-actions">
          {history.length > 0 && (
            <>
              <button
                className="v2-action-btn"
                onClick={handleExportCSV}
                title="Export scan history as CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
              <button
                className="v2-action-btn"
                onClick={handleExportJSON}
                title="Export scan history as JSON"
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </>
          )}
          <button
            className="v2-btn-primary"
            onClick={onRefreshHistory}
            disabled={historyLoading}
            title="Fetch latest scans from MySQL database"
          >
            <RefreshCw size={14} className={historyLoading ? 'v2-spin' : ''} />
            <span>{historyLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* ── Top Summary Metrics ── */}
      <section className="v2-metrics-grid">
        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Total Scans Recorded</span>
            <div className="v2-metric-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
              <Database size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value"><span>{metrics.total}</span></div>
            <div className="v2-metric-sub">All-time recorded scans</div>
          </div>
        </div>

        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Avg Security Score</span>
            <div className="v2-metric-icon v2-icon-green">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              <span style={{ color: metrics.avgScore >= 80 ? '#10b981' : metrics.avgScore >= 60 ? '#f59e0b' : '#ef4444' }}>
                {metrics.avgScore}/100
              </span>
            </div>
            <div className="v2-metric-sub">
              {metrics.avgScore >= 80 ? 'Overall Good' : metrics.avgScore >= 60 ? 'Moderate Risk' : 'Action Needed'}
            </div>
          </div>
        </div>

        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">High / Critical Scans</span>
            <div className="v2-metric-icon v2-icon-red">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value"><span>{metrics.highRiskCount}</span></div>
            <div className="v2-metric-sub">Requires patch verification</div>
          </div>
        </div>

        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Clean Scans</span>
            <div className="v2-metric-icon v2-icon-green">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              <span className="v2-val-green">{metrics.cleanCount}</span>
            </div>
            <div className="v2-metric-sub">0 vulnerabilities flagged</div>
          </div>
        </div>
      </section>

      {/* ── Search & Filter Bar ── */}
      <div className="v2-results-filter-bar">
        <div className="v2-filter-chips">
          <button
            className={`v2-filter-chip ${activeFilter === 'all' ? 'v2-filter-chip-active' : ''}`}
            onClick={() => { setActiveFilter('all'); setPage(1); }}
          >
            All Scans ({history.length})
          </button>
          <button
            className={`v2-filter-chip ${activeFilter === 'source' ? 'v2-filter-chip-active' : ''}`}
            onClick={() => { setActiveFilter('source'); setPage(1); }}
          >
            Source Code
          </button>
          <button
            className={`v2-filter-chip ${activeFilter === 'generated' ? 'v2-filter-chip-active' : ''}`}
            onClick={() => { setActiveFilter('generated'); setPage(1); }}
          >
            AI Generated
          </button>
          <button
            className={`v2-filter-chip ${activeFilter === 'high_risk' ? 'v2-filter-chip-active' : ''}`}
            onClick={() => { setActiveFilter('high_risk'); setPage(1); }}
          >
            High Risk ({metrics.highRiskCount})
          </button>
          <button
            className={`v2-filter-chip ${activeFilter === 'clean' ? 'v2-filter-chip-active' : ''}`}
            onClick={() => { setActiveFilter('clean'); setPage(1); }}
          >
            Clean ({metrics.cleanCount})
          </button>
        </div>

        <div className="v2-results-search-wrap">
          <Search size={13} className="v2-search-icon" />
          <input
            className="v2-results-search"
            placeholder="Search by ID, date, or source..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="v2-panel">
        {historyLoading ? (
          <div className="v2-empty-state">
            <Loader2 size={36} className="v2-spin" style={{ color: '#c084fc' }} />
            <div className="v2-empty-title">Loading scan history...</div>
            <div className="v2-empty-desc">Connecting to MySQL backend on localhost:4000</div>
          </div>
        ) : historyError ? (
          <div className="v2-empty-state">
            <Database size={36} style={{ color: '#ef4444' }} />
            <div className="v2-empty-title">Database Connection Notice</div>
            <div className="v2-empty-desc" style={{ maxWidth: 440 }}>
              {historyError.includes('500') || historyError.includes('Failed to fetch')
                ? 'Backend server or MySQL database is starting up. Run `node index.js` inside code-scan folder to enable persistent history.'
                : historyError}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="v2-btn-primary" onClick={onRefreshHistory}>
                <RefreshCw size={14} /> Retry Connection
              </button>
              <button className="v2-btn-secondary" onClick={() => goToNav('Code Scan')}>
                <Code2 size={14} /> Go to Code Scan
              </button>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="v2-empty-state">
            <Inbox size={36} className="v2-empty-icon" />
            <div className="v2-empty-title">No previous scans found</div>
            <div className="v2-empty-desc">Run a scan from Code Scan or generate code with the AI Synthesizer to record your audit history here.</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="v2-btn-primary" onClick={() => goToNav('Code Scan')}>
                <Code2 size={14} /> Run First Scan
              </button>
              <button className="v2-btn-secondary" onClick={() => goToNav('Generate Code')}>
                <Wand2 size={14} /> Generate Code
              </button>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="v2-empty-state">
            <Search size={32} className="v2-empty-icon" />
            <div className="v2-empty-title">No scans matched your search</div>
            <div className="v2-empty-desc">Try adjusting your keyword or clearing the filter chip.</div>
            <button className="v2-btn-secondary" style={{ marginTop: 12 }} onClick={() => { setSearch(''); setActiveFilter('all'); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="v2-table-responsive">
              <table className="v2-findings-table">
                <thead>
                  <tr>
                    <th>Scan Details / Source</th>
                    <th style={{ width: 120 }}>Risk Level</th>
                    <th style={{ width: 115 }}>Status</th>
                    <th style={{ width: 120 }}>Findings</th>
                    <th style={{ width: 130 }}>Date & Time</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((scan, i) => {
                    const rawRisk = (scan.risk_level || scan.riskLevel || 'Low').toLowerCase();
                    const riskBadgeClass =
                      rawRisk === 'critical'
                        ? 'v2-badge-critical'
                        : rawRisk === 'high'
                        ? 'v2-badge-high'
                        : rawRisk === 'medium'
                        ? 'v2-badge-medium'
                        : 'v2-badge-low';

                    const findingsCount = scan.total_findings ?? scan.totalFindings ?? (scan.findings || []).length;
                    const findingsList = scan.findings || [];
                    const allFixed = findingsCount > 0 && findingsList.length > 0 && findingsList.every(f => f.fixed || f._fixed || f.status === 'fixed');
                    const isPending = findingsCount > 0 && !allFixed;
                    const src = scan.source_type || scan.sourceType || 'Source Code';
                    const isAiGen = src.toLowerCase().includes('generated') || src.toLowerCase().includes('ai');
                    const scanId = scan.id || (filteredHistory.length - ((pageClamped - 1) * PAGE_SIZE + i));

                    return (
                      <tr key={scan.id || i} className="v2-table-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: isAiGen ? 'rgba(192, 132, 252, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                color: isAiGen ? '#c084fc' : '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isAiGen ? <Wand2 size={14} /> : <Code2 size={14} />}
                            </div>
                            <div>
                              <div className="v2-issue-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{getScanName(scan)}</span>
                                <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'monospace' }}>#{scanId}</span>
                                <span
                                  className="v2-status-pill"
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    background: isAiGen ? 'rgba(192, 132, 252, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                                    color: isAiGen ? '#c084fc' : 'var(--text-dim)',
                                  }}
                                >
                                  {src}
                                </span>
                              </div>
                              <div className="v2-issue-loc">{formatExactDate(scan.scanned_at || scan.scannedAt)}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`v2-sev-badge ${riskBadgeClass}`}>
                            {scan.risk_level || scan.riskLevel || 'Low'}
                          </span>
                        </td>

                        <td>
                          {isPending ? (
                            <button
                              onClick={(e) => handleToggleScanStatus(scan, e)}
                              title="Click to toggle status to Fixed"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <AlertTriangle size={11} />
                              Pending
                            </button>
                          ) : allFixed ? (
                            <button
                              onClick={(e) => handleToggleScanStatus(scan, e)}
                              title="Click to toggle status to Pending"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <CheckCircle2 size={11} />
                              Fixed
                            </button>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <CheckCircle2 size={11} />
                              Clean
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="v2-metric-caption">
                            {findingsCount === 0 ? (
                              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Clean
                              </span>
                            ) : (
                              <span>{findingsCount} issue{findingsCount !== 1 ? 's' : ''}</span>
                            )}
                          </span>
                        </td>

                        <td className="v2-time-cell">
                          {formatRelTime(scan.scanned_at || scan.scannedAt)}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="v2-btn-secondary"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                            onClick={() => handleInspectScan(scan)}
                            title="Load findings and inspect report in Scan Results"
                          >
                            <ArrowUpRight size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredHistory.length > PAGE_SIZE && (
              <div className="v2-results-pagination" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 10 }}>
                <span className="v2-pagination-info">
                  {(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
                </span>
                <div className="v2-pagination-btns">
                  <button
                    className="v2-icon-action-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageClamped === 1}
                  >
                    <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {pageClamped} / {totalPages}
                  </span>
                  <button
                    className="v2-icon-action-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageClamped === totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
