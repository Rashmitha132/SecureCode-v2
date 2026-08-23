// DashboardView.jsx
// Redesigned Dashboard for SecureCode: Clean, Modern, Lightweight (Linear/Vercel inspired)
// 100% real data from backend APIs and active scan state. Supports Light & Dark themes.

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  ShieldAlert,
  Brain,
  Clock,
  PieChart,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Wand2,
  Wrench,
  FileCode,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';

const API_URL = 'http://localhost:4000';

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function parseFindings(scan) {
  if (!scan) return [];
  if (Array.isArray(scan.findings)) return scan.findings;
  if (typeof scan.findings === 'string') {
    try { return JSON.parse(scan.findings); } catch { return []; }
  }
  if (typeof scan.findings_json === 'string') {
    try { return JSON.parse(scan.findings_json); } catch { return []; }
  }
  if (Array.isArray(scan.findings_json)) return scan.findings_json;
  return [];
}

export default function DashboardView({ results, history = [], historyLoading = false, goToNav }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [learningStats, setLearningStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Fetch real data from backend API
  const fetchDashboardStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);

    try {
      const [dashRes, learnRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/dashboard`),
        fetch(`${API_URL}/api/learning/stats`),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const data = await dashRes.value.json();
        setDashboardData(data);
      }

      if (learnRes.status === 'fulfilled' && learnRes.value.ok) {
        const lData = await learnRes.value.json();
        setLearningStats(lData);
      }
    } catch (err) {
      console.warn('[DashboardView] API fetch notice:', err.message);
      setFetchError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Compute unified, 100% real metrics from active results, history, and API response
  const {
    securityScore,
    scoreRating,
    totalScans,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalFindingsCount,
    learningIteration,
    learningAccuracy,
    recentActivities,
    top5Findings,
    hasScans,
  } = useMemo(() => {
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.scannedAt || b.scanned_at || 0) - new Date(a.scannedAt || a.scanned_at || 0));
    const activeScan = results || sortedHistory[0] || null;
    const activeFindings = results ? (results.findings || []) : (sortedHistory[0] ? parseFindings(sortedHistory[0]) : (dashboardData?.latestFindings || []));

    // Calculate total scans count (strictly real)
    const scanCount = Math.max(
      sortedHistory.length,
      dashboardData?.metrics?.totalScans || 0
    );

    // Calculate real security score (0-100)
    let score = null;
    if (results && typeof results.riskScore === 'number') {
      score = Math.max(0, Math.min(100, Math.round(100 - results.riskScore)));
    } else if (activeScan && typeof activeScan.riskScore === 'number') {
      score = Math.max(0, Math.min(100, Math.round(100 - activeScan.riskScore)));
    } else if (dashboardData?.metrics?.securityScore != null) {
      score = dashboardData.metrics.securityScore;
    } else if (scanCount > 0) {
      score = 100;
    }

    let rating = 'No Scans';
    if (score !== null) {
      if (score >= 80) rating = 'Optimal Posture';
      else if (score >= 60) rating = 'Moderate Risk';
      else rating = 'Needs Attention';
    }

    // Severity counts from real active findings or API
    let crit = 0;
    let high = 0;
    let med = 0;
    let low = 0;

    if (activeFindings.length > 0) {
      for (const f of activeFindings) {
        const s = (f.severity || '').toLowerCase();
        if (s === 'critical') crit++;
        else if (s === 'high') high++;
        else if (s === 'medium') med++;
        else low++;
      }
    } else if (dashboardData?.severityDistribution) {
      crit = dashboardData.severityDistribution.critical || 0;
      high = dashboardData.severityDistribution.high || 0;
      med = dashboardData.severityDistribution.medium || 0;
      low = dashboardData.severityDistribution.low || 0;
    }

    const totalIssues = crit + high + med + low;

    // Learning model iteration & accuracy
    let iter = 1;
    let acc = null;
    if (learningStats?.latestIteration?.iteration) {
      iter = learningStats.latestIteration.iteration;
      if (typeof learningStats.latestIteration.gnn_accuracy === 'number') {
        acc = Math.round(learningStats.latestIteration.gnn_accuracy * 1000) / 10;
      }
    } else if (dashboardData?.metrics?.learning?.iteration) {
      iter = dashboardData.metrics.learning.iteration;
      acc = dashboardData.metrics.learning.accuracy;
    }

    // Recent activity (latest 4 events only)
    const activities = [];

    // If active scan was conducted this session, place at top
    if (results && results.scannedAt) {
      activities.push({
        id: 'active-scan',
        type: 'scan',
        title: 'Active Code Scan Completed',
        description: `${results.totalFindings || (results.findings || []).length} findings • Risk score: ${results.riskScore || 0}/100`,
        time: results.scannedAt || new Date().toISOString(),
      });
    }

    // Add real history items
    if (sortedHistory.length > 0) {
      for (const h of sortedHistory.slice(0, 4)) {
        const findingsList = parseFindings(h);
        const fCount = h.totalFindings ?? h.total_findings ?? findingsList.length;
        const timeVal = h.scannedAt || h.scanned_at;
        activities.push({
          id: `hist-${h.id || timeVal}`,
          type: 'scan',
          title: 'Code Security Scan',
          description: `${fCount} issue${fCount === 1 ? '' : 's'} identified • Risk ${h.riskScore ?? h.risk_score ?? 0}/100`,
          time: timeVal,
        });

        if (h.repair_attempted || h.repairAttempted) {
          activities.push({
            id: `repair-${h.id}`,
            type: 'repair',
            title: 'Auto-Repair Patch Generated',
            description: 'Vulnerability remediation generated',
            time: timeVal,
          });
        }
      }
    }

    // Merge with API activities if available
    if (dashboardData?.recentActivity && Array.isArray(dashboardData.recentActivity)) {
      for (const act of dashboardData.recentActivity) {
        if (!activities.some((a) => a.id === act.id)) {
          activities.push(act);
        }
      }
    }

    // Deduplicate and take strictly 4 items max
    const finalActivities = activities
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 4);

    // Latest Findings (Top 5)
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedFindings = [...activeFindings]
      .sort((a, b) => (severityRank[(a.severity || '').toLowerCase()] ?? 4) - (severityRank[(b.severity || '').toLowerCase()] ?? 4))
      .slice(0, 5)
      .map((f, idx) => ({
        id: idx,
        severity: f.severity || 'Medium',
        type: f.type || f.category || 'Security Vulnerability',
        location: f.location || (f.fileName ? (f.line ? `${f.fileName}:${f.line}` : f.fileName) : (f.line ? `Line ${f.line}` : 'Source snippet')),
        time: f.time || activeScan?.scannedAt || activeScan?.scanned_at || new Date().toISOString(),
        explanation: f.explanation || '',
      }));

    return {
      securityScore: score,
      scoreRating: rating,
      totalScans: scanCount,
      criticalCount: crit,
      highCount: high,
      mediumCount: med,
      lowCount: low,
      totalFindingsCount: totalIssues,
      learningIteration: iter,
      learningAccuracy: acc,
      recentActivities: finalActivities,
      top5Findings: sortedFindings,
      hasScans: scanCount > 0 || results !== null,
    };
  }, [results, history, dashboardData, learningStats]);

  // Donut chart segment data
  const severitySegments = useMemo(() => {
    const list = [
      { label: 'Critical', count: criticalCount, color: '#ef4444' },
      { label: 'High', count: highCount, color: '#f97316' },
      { label: 'Medium', count: mediumCount, color: '#eab308' },
      { label: 'Low', count: lowCount, color: '#10b981' },
    ];
    return list;
  }, [criticalCount, highCount, mediumCount, lowCount]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'generate':
        return { icon: Wand2, bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' };
      case 'repair':
        return { icon: Wrench, bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
      case 'learning':
        return { icon: Brain, bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308' };
      default:
        return { icon: Search, bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' };
    }
  };

  const getSeverityBadgeClass = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return 'v2-badge-critical';
    if (s === 'high') return 'v2-badge-high';
    if (s === 'medium') return 'v2-badge-medium';
    return 'v2-badge-low';
  };

  return (
    <div className="v2-dashboard-wrapper">
      {/* ── Dashboard Header ── */}
      <header className="v2-dash-header">
        <div className="v2-dash-header-title">
          <div className="v2-dash-tag">
            <ShieldCheck size={13} className="v2-tag-icon" />
            <span>Security Posture</span>
          </div>
          <h1>Dashboard</h1>
          <p className="hide-on-mobile">Real-time security analytics, vulnerability distribution, and self-learning telemetry.</p>
        </div>

        <div className="v2-dash-actions">
          <button
            className="v2-btn-ghost"
            onClick={() => fetchDashboardStats(true)}
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <RefreshCw size={14} className={refreshing ? 'v2-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            className="v2-btn-primary"
            onClick={() => goToNav && goToNav('Code Scan')}
          >
            <Search size={14} />
            <span>New Scan</span>
          </button>
        </div>
      </header>

      {/* ── 1. Top Section: 4 Clean Metric Cards ── */}
      <section className="v2-metrics-grid" aria-label="Key Metrics">
        {/* Metric 1: Security Score */}
        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Security Score</span>
            <div className="v2-metric-icon v2-icon-purple">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              {securityScore !== null ? (
                <>
                  <span className={securityScore >= 80 ? 'v2-val-green' : securityScore >= 60 ? 'v2-val-amber' : 'v2-val-red'}>
                    {securityScore}
                  </span>
                  <span className="v2-metric-denom">/100</span>
                </>
              ) : (
                <span className="v2-val-muted">--<span className="v2-metric-denom">/100</span></span>
              )}
            </div>
            <div className="v2-metric-sub">
              {securityScore !== null ? (
                <span className={`v2-status-pill ${securityScore >= 80 ? 'v2-status-good' : securityScore >= 60 ? 'v2-status-warn' : 'v2-status-bad'}`}>
                  {scoreRating}
                </span>
              ) : (
                <span className="v2-metric-caption">No scans recorded yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: Total Scans */}
        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Total Scans</span>
            <div className="v2-metric-icon v2-icon-blue">
              <Search size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              <span>{totalScans}</span>
            </div>
            <div className="v2-metric-sub">
              <span className="v2-metric-caption">
                {totalScans === 1 ? '1 scan conducted' : `${totalScans} scans executed`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Critical Issues */}
        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Critical Issues</span>
            <div className="v2-metric-icon v2-icon-red">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              <span className={criticalCount > 0 ? 'v2-val-red' : 'v2-val-green'}>
                {criticalCount}
              </span>
            </div>
            <div className="v2-metric-sub">
              <span className="v2-metric-caption">
                {criticalCount > 0 ? 'Requires immediate remediation' : 'No critical vulnerabilities'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Learning Iteration */}
        <div className="v2-metric-card">
          <div className="v2-metric-header">
            <span className="v2-metric-label">Learning Iteration</span>
            <div className="v2-metric-icon v2-icon-purple">
              <Brain size={16} />
            </div>
          </div>
          <div className="v2-metric-body">
            <div className="v2-metric-value">
              <span>v{learningIteration}</span>
            </div>
            <div className="v2-metric-sub">
              <span className="v2-metric-highlight">
                {learningAccuracy !== null ? `${learningAccuracy}% GNN Accuracy` : 'AST Graph Engine Active'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Middle Section: Two Balanced Panels ── */}
      <section className="v2-mid-grid">
        {/* Left Panel: Recent Activity (Latest 4 events only) */}
        <div className="v2-panel">
          <div className="v2-panel-header">
            <div className="v2-panel-title-wrap">
              <Activity size={16} className="v2-panel-header-icon" />
              <h3>Recent Activity</h3>
            </div>
            <span className="v2-chip-subtle">
              {recentActivities.length > 0 ? `${recentActivities.length} Latest Events` : 'Real-time Feed'}
            </span>
          </div>

          <div className="v2-panel-body">
            {recentActivities.length > 0 ? (
              <div className="v2-activity-list">
                {recentActivities.map((act, i) => {
                  const meta = getActivityIcon(act.type);
                  const IconComponent = meta.icon;
                  return (
                    <div key={act.id || i} className="v2-activity-row">
                      <div className="v2-activity-icon" style={{ background: meta.bg, color: meta.color }}>
                        <IconComponent size={14} />
                      </div>
                      <div className="v2-activity-main">
                        <div className="v2-activity-title">{act.title}</div>
                        <div className="v2-activity-desc">{act.description}</div>
                      </div>
                      <div className="v2-activity-time">
                        <Clock size={11} />
                        <span>{formatRelativeTime(act.time)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="v2-empty-state-card">
                <div className="v2-empty-icon-wrap">
                  <Clock size={22} />
                </div>
                <h4>No Recent Activity</h4>
                <p>Run your first security scan or generate code to track live events.</p>
                <button
                  className="v2-btn-secondary"
                  onClick={() => goToNav && goToNav('Code Scan')}
                >
                  Start Scan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Severity Distribution (Simple Donut Chart) */}
        <div className="v2-panel">
          <div className="v2-panel-header">
            <div className="v2-panel-title-wrap">
              <PieChart size={16} className="v2-panel-header-icon" />
              <h3>Severity Distribution</h3>
            </div>
            <span className="v2-chip-subtle">
              {totalFindingsCount > 0 ? `${totalFindingsCount} Active Issues` : 'Current Posture'}
            </span>
          </div>

          <div className="v2-panel-body">
            {totalFindingsCount > 0 ? (
              <div className="v2-donut-container">
                {/* SVG Donut Chart */}
                <div className="v2-donut-chart-wrap">
                  <svg className="v2-donut-svg" viewBox="0 0 42 42">
                    {/* Background Circle */}
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="transparent"
                      className="v2-donut-bg-track"
                      strokeWidth="5"
                    />

                    {/* Colored Donut Segments */}
                    {(() => {
                      let accumulatedOffset = 25; // Start at top (12 o'clock)
                      return severitySegments.map((s) => {
                        const pct = (s.count / totalFindingsCount) * 100;
                        if (pct <= 0) return null;
                        const circle = (
                          <circle
                            key={s.label}
                            cx="21"
                            cy="21"
                            r="15.9"
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth="5"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={accumulatedOffset}
                            strokeLinecap="round"
                            className="v2-donut-segment"
                          />
                        );
                        accumulatedOffset -= pct;
                        return circle;
                      });
                    })()}
                  </svg>

                  {/* Centered Total Label */}
                  <div className="v2-donut-center-text">
                    <span className="v2-donut-count">{totalFindingsCount}</span>
                    <span className="v2-donut-label">Issues</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="v2-donut-legend">
                  {severitySegments.map((s) => {
                    const pct = totalFindingsCount > 0 ? Math.round((s.count / totalFindingsCount) * 100) : 0;
                    return (
                      <div key={s.label} className="v2-legend-row">
                        <div className="v2-legend-item-left">
                          <span className="v2-legend-dot" style={{ background: s.color }} />
                          <span className="v2-legend-label">{s.label}</span>
                        </div>
                        <div className="v2-legend-item-right">
                          <span className="v2-legend-count">{s.count}</span>
                          <span className="v2-legend-pct">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="v2-empty-state-card">
                <div className="v2-empty-icon-wrap v2-icon-green-bg">
                  <CheckCircle2 size={22} className="v2-val-green" />
                </div>
                <h4>Zero Active Issues</h4>
                <p>
                  {hasScans
                    ? 'All scanned components passed security checks cleanly.'
                    : 'Run a code scan to populate the severity distribution.'}
                </p>
                <button
                  className="v2-btn-secondary"
                  onClick={() => goToNav && goToNav('Code Scan')}
                >
                  {hasScans ? 'Run New Scan' : 'Start Code Scan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Bottom Section: Latest Findings (Top 5 Table) ── */}
      <section className="v2-panel v2-findings-section">
        <div className="v2-panel-header">
          <div className="v2-panel-title-wrap">
            <ShieldAlert size={16} className="v2-panel-header-icon" />
            <h3>Latest Findings</h3>
            <span className="v2-badge-count">{top5Findings.length > 0 ? `Top ${top5Findings.length}` : '0 Findings'}</span>
          </div>

          <button
            className="v2-link-btn"
            onClick={() => goToNav && goToNav('Scan Results')}
          >
            <span>View All in Results</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="v2-panel-body v2-table-panel-body">
          {top5Findings.length > 0 ? (
            <div className="v2-table-responsive">
              <table className="v2-findings-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Severity</th>
                    <th>Issue</th>
                    <th style={{ width: '180px' }}>Location</th>
                    <th style={{ width: '120px' }}>Time</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Findings.map((f) => (
                    <tr key={f.id} className="v2-table-row">
                      <td>
                        <span className={`v2-sev-badge ${getSeverityBadgeClass(f.severity)}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td>
                        <div className="v2-finding-issue-cell">
                          <span className="v2-issue-name">{f.type}</span>
                          {f.explanation && (
                            <span className="v2-issue-desc">{f.explanation}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <code className="v2-location-code">{f.location}</code>
                      </td>
                      <td className="v2-time-cell">
                        {formatRelativeTime(f.time)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="v2-btn-table-action"
                          onClick={() => goToNav && goToNav('Scan Results')}
                          title="Inspect details in Scan Results"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="v2-empty-state-card v2-empty-table-state">
              <div className="v2-empty-icon-wrap v2-icon-green-bg">
                <CheckCircle2 size={22} className="v2-val-green" />
              </div>
              <h4>No Security Findings</h4>
              <p>No vulnerabilities or secrets detected. Scans are currently all clean.</p>
              <button
                className="v2-btn-secondary"
                onClick={() => goToNav && goToNav('Code Scan')}
              >
                Scan Code Now
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
