// ScanResultsView.jsx
// Redesigned Scan Results Page matching the Linear/Vercel Dark aesthetic of Code Scan & Generate Code.
// Fully integrated with real backend data from MySQL, Groq LLM, AST-GNN, and Entropy detectors.
// Contained width (max-width: 1140px), seamless support for both Source Code scans & AI Generated Code scans.

import { useState, useEffect } from 'react';
import {
  FileText, ShieldAlert, CheckCircle2, AlertTriangle, Search,
  Brain, Wrench, X, Copy, Check, ChevronRight, ExternalLink,
  Clock, RotateCcw, Loader2, ShieldCheck, Layers, ClipboardList,
  Inbox, ArrowUpRight, Code2, Sparkles, Wand2, Terminal, RefreshCw,
  Download, Printer, FileSpreadsheet, Zap
} from 'lucide-react';
import RepairView from './RepairView';

const API_URL = 'http://localhost:4000';

const SEV_CLASS = {
  critical: 'v2-badge-critical',
  high: 'v2-badge-high',
  medium: 'v2-badge-medium',
  low: 'v2-badge-low',
};

function sevClass(sev = '') {
  return SEV_CLASS[(sev || '').toLowerCase()] || 'v2-badge-low';
}

function computeRiskScore(f) {
  const base = { critical: 9, high: 7, medium: 4, low: 2 }[(f.severity || '').toLowerCase()] ?? 3;
  const confBoost = typeof f.confidence === 'number' ? Math.round(f.confidence * 2) : 1;
  return Math.min(10, base + confBoost);
}

function locationForFinding(f) {
  if (f.fileName && f.line) return `${f.fileName}:${f.line}`;
  if (f.fileName) return f.fileName;
  if (f.line) return `Line ${f.line}`;
  if (f.packageName) return `package.json — ${f.packageName}${f.version ? `@${f.version}` : ''}`;
  return 'Source snippet';
}

function formatRelTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return 'Unknown';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ScoreRing({ score = 0, color = '#10b981', label = 'Good' }) {
  const dash = Math.round(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="80" height="80" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="21" cy="21" r="15.9" fill="transparent"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${100 - dash}`}
          strokeDashoffset="25"
          strokeLinecap="round"
        />
        <text x="21" y="19" textAnchor="middle" fontSize="9" fill="var(--text)" fontWeight="700">{score}</text>
        <text x="21" y="26" textAnchor="middle" fontSize="3.5" fill="var(--text-faint)">/100</text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

function getVulnerableSnippet(finding, fullCode) {
  if (!finding) return 'No finding selected.';

  // 1. If backend explicitly provided the vulnerable code line
  if (finding.vulnerableCode && finding.vulnerableCode.trim()) {
    const prefix = finding.line ? `${finding.line} | ` : '';
    return finding.vulnerableCode.startsWith(`${finding.line} |`) ? finding.vulnerableCode : `${prefix}${finding.vulnerableCode}`;
  }

  // 2. Extract exact line from the user's scanned code
  if (fullCode) {
    const lines = fullCode.split(/\r?\n/);
    if (finding.line && lines[finding.line - 1] !== undefined) {
      const actualLine = lines[finding.line - 1];
      return `${finding.line} | ${actualLine}`;
    }
  }

  // 3. Fallback to matchPreview if it's actual code
  if (finding.matchPreview && finding.matchPreview.trim() && !finding.matchPreview.includes('policy') && !finding.matchPreview.includes('Missing')) {
    return finding.line ? `${finding.line} | ${finding.matchPreview}` : finding.matchPreview;
  }

  // 4. Clean fallback showing line and issue
  return finding.line
    ? `Line ${finding.line} | // Flagged vulnerable construct`
    : `// Global Scope | ${finding.type || 'Security vulnerability'}`;
}

function getCorrectedSnippet(finding, fullCode) {
  if (!finding) return '';

  // 1. If backend explicitly provided the corrected code line
  if (finding.correctedCode && finding.correctedCode.trim()) {
    const prefix = finding.line ? `${finding.line} | ` : '';
    return finding.correctedCode.startsWith(`${finding.line} |`) ? finding.correctedCode : `${prefix}${finding.correctedCode}`;
  }

  if (finding.suggestedCode) return finding.suggestedCode;

  // 2. Extract the actual line from fullCode to perform smart line-level replacement
  const lines = fullCode ? fullCode.split(/\r?\n/) : [];
  const lineIdx = finding.line ? finding.line - 1 : -1;
  const lineContent = lineIdx >= 0 && lines[lineIdx] ? lines[lineIdx] : '';
  const linePrefix = finding.line ? `${finding.line} | ` : '';

  const type = (finding.type || finding.category || '').toLowerCase();
  const exp = (finding.explanation || '').toLowerCase();
  const fixText = (finding.fix || '').trim();

  // ── CORS Misconfiguration ──
  if (type.includes('cors') || exp.includes('cors') || lineContent.includes('CORSMiddleware') || lineContent.includes('cors')) {
    if (lineContent && lineContent.includes('allow_origins')) {
      const patched = lineContent
        .replace(/allow_origins\s*=\s*\[\s*["']\*["']\s*\]/g, 'allow_origins=["https://yourdomain.com"]')
        .replace(/allow_credentials\s*=\s*True/g, 'allow_credentials=False');
      return `${linePrefix}${patched.trim()}`;
    }
    return `${linePrefix}app.add_middleware(CORSMiddleware, allow_origins=["https://yourdomain.com"], allow_credentials=False)`;
  }

  // ── Missing Authentication / Authorization ──
  if (type.includes('auth') || type.includes('permission') || type.includes('access control') || exp.includes('authentication') || exp.includes('authorization')) {
    if (lineContent && (lineContent.includes('def ') || lineContent.includes('@app.'))) {
      return `${linePrefix}@app.get(..., dependencies=[Depends(get_current_user)])`;
    }
    if (lineContent && lineContent.includes('app.use(')) {
      return `${linePrefix}app.use('/api', authenticateToken, router);`;
    }
    return `${linePrefix}// Enforce authentication guard on this endpoint\nrouter.use(authenticateJWT);`;
  }

  // ── Verbose Error Handling / Stack Trace Leak ──
  if (type.includes('verbose') || type.includes('error message') || type.includes('exception') || exp.includes('exception')) {
    if (lineContent) {
      return `${linePrefix}logger.error(e); return {"error": "Internal server error"}`;
    }
    return `${linePrefix}except Exception as e:\n    logger.error(f"Internal error: {e}")\n    return {"error": "Internal server error"}`;
  }

  // ── SQL Injection ──
  if (type.includes('sql') || exp.includes('sql')) {
    if (lineContent && (lineContent.includes('SELECT') || lineContent.includes('execute') || lineContent.includes('query'))) {
      return `${linePrefix}cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`;
    }
    return `${linePrefix}// Parameterized query (CWE-89)\nconst result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);`;
  }

  // ── Hardcoded Secret / API Key / Token ──
  if (type.includes('secret') || type.includes('key') || type.includes('token') || type.includes('credential') || type.includes('password') || type.includes('jwt')) {
    if (lineContent && lineContent.includes('=')) {
      const varName = lineContent.split('=')[0].trim();
      return `${linePrefix}${varName} = os.environ.get("${varName.toUpperCase()}") or process.env.${varName.toUpperCase()}`;
    }
    return `${linePrefix}const API_KEY = process.env.API_KEY || os.environ.get("API_KEY");`;
  }

  // ── XSS / Output Sanitization ──
  if (type.includes('xss') || exp.includes('xss') || exp.includes('sanitize')) {
    return `${linePrefix}element.textContent = DOMPurify.sanitize(userInput);`;
  }

  // ── Path Traversal ──
  if (type.includes('path') || type.includes('traversal') || exp.includes('traversal')) {
    return `${linePrefix}safe_path = os.path.abspath(os.path.join(SAFE_DIR, os.path.basename(user_file)))`;
  }

  // If fix text itself contains code characters
  if (fixText && (fixText.includes(';') || fixText.includes('(') || fixText.includes('='))) {
    return `${linePrefix}${fixText}`;
  }

  return `${linePrefix}// Recommended Fix: ${fixText || 'Apply input validation and secure authorization.'}`;
}

function applySingleFix(finding, fullCode) {
  if (!fullCode || !finding) return fullCode;
  const lines = fullCode.split(/\r?\n/);

  let corrected = getCorrectedSnippet(finding, fullCode);
  // Strip line number prefix like "4 | " if present
  if (finding.line && corrected.startsWith(`${finding.line} | `)) {
    corrected = corrected.slice(`${finding.line} | `.length);
  }

  // 1. Line-based replacement
  if (finding.line && finding.line >= 1 && finding.line <= lines.length) {
    lines[finding.line - 1] = corrected;
    return lines.join('\n');
  }

  // 2. Pattern-based replacement fallback
  if (finding.matchPreview && fullCode.includes(finding.matchPreview)) {
    return fullCode.replace(finding.matchPreview, corrected);
  }

  return fullCode;
}

export default function ScanResultsView({
  results,
  history,
  code,
  setCode,
  scanning,
  onRescan,
  onApplyRepair,
  goToNav,
  setResults,
  scanSource = 'Source Code'
}) {
  const [tab, setTab] = useState('current'); // 'current' | 'generated' | 'history'

  // Resolve effective scan results: active scan if present with findings, or latest recorded scan from history / localStorage
  const effectiveResults = (() => {
    if (results && results.findings && results.findings.length > 0) {
      return results;
    }
    const hist = Array.isArray(history) && history.length > 0 ? history : [];
    if (hist.length > 0 && hist[0]?.findings?.length > 0) {
      return hist[0];
    }
    try {
      const cached = localStorage.getItem('sc_local_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.findings?.length > 0) {
          return parsed[0];
        }
      }
    } catch (e) {}
    return results || { findings: [] };
  })();

  const findings = effectiveResults?.findings || [];

  const [fixedMap, setFixedMap] = useState(() => {
    const init = {};
    findings.forEach((f, i) => {
      if (f.fixed || f._fixed || f.status === 'fixed') {
        init[i] = true;
      }
    });
    return init;
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [page, setPage] = useState(1);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairData, setRepairData] = useState(null);
  const [repairError, setRepairError] = useState(null);
  const [copiedFix, setCopiedFix] = useState(false);
  const [applyToast, setApplyToast] = useState(null);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const updated = {};
    findings.forEach((f, i) => {
      if (f.fixed || f._fixed || f.status === 'fixed') {
        updated[i] = true;
      }
    });
    setFixedMap(prev => ({ ...prev, ...updated }));
    setActiveFilter('all');
    setSearch('');
    setSelectedIndex(null);
    setPage(1);
    setRepairData(null);
    setRepairError(null);
  }, [effectiveResults?.scannedAt || effectiveResults?.timestamp || effectiveResults?.id]);

  async function handleAutoRepair() {
    if (!code?.trim() || isRepairing) return;
    setIsRepairing(true);
    setRepairError(null);
    try {
      const res = await fetch(`${API_URL}/api/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, findings, language: 'python' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Repair failed (${res.status})`);
      setRepairData(await res.json());
    } catch (err) {
      setRepairError(err.message === 'Failed to fetch' ? "Can't reach backend on localhost:4000." : err.message);
    } finally {
      setIsRepairing(false);
    }
  }

  function handleAcceptRepair(newCode) {
    setRepairData(null);
    if (onApplyRepair) onApplyRepair(newCode);
  }

  function toggleFixed(idx) {
    const finding = findings[idx];
    const currentlyFixed = Boolean(fixedMap[idx] || (finding && (finding.fixed || finding._fixed || finding.status === 'fixed')));
    const willBeFixed = !currentlyFixed;

    setFixedMap(prev => ({ ...prev, [idx]: willBeFixed }));

    const updatedFindings = findings.map((f, i) => {
      if (i === idx) {
        return {
          ...f,
          fixed: willBeFixed,
          _fixed: willBeFixed,
          status: willBeFixed ? 'fixed' : 'open',
        };
      }
      return f;
    });

    if (setResults) {
      setResults(prev => ({
        ...prev,
        findings: updatedFindings,
      }));
    }

    // When marked as fixed, update the user's code in Code Scan immediately!
    if (willBeFixed && finding && setCode && code) {
      const updatedCode = applySingleFix(finding, code);
      if (updatedCode !== code) {
        setCode(updatedCode);
        setApplyToast(`✓ Applied fix for "${finding.type || 'vulnerability'}" to Code Scan!`);
        setTimeout(() => setApplyToast(null), 3000);
      }
    }
  }

  function handleFixAll() {
    if (!findings.length || !code) return;
    let updatedCode = code;

    // Sort findings in descending order of line numbers so line replacements don't shift earlier lines
    const sortedIndices = findings
      .map((f, i) => ({ f, i }))
      .sort((a, b) => (b.f.line || 0) - (a.f.line || 0));

    const newFixedMap = { ...fixedMap };
    const updatedFindings = findings.map(f => ({ ...f }));

    sortedIndices.forEach(({ f, i }) => {
      updatedCode = applySingleFix(f, updatedCode);
      newFixedMap[i] = true;
      updatedFindings[i].fixed = true;
      updatedFindings[i]._fixed = true;
      updatedFindings[i].status = 'fixed';
    });

    setFixedMap(newFixedMap);
    if (setCode) setCode(updatedCode);
    if (setResults) {
      setResults(prev => ({
        ...prev,
        findings: updatedFindings,
      }));
    }

    setApplyToast(`✓ All ${findings.length} vulnerabilities fixed & reflected in Code Scan!`);
    setTimeout(() => setApplyToast(null), 3500);
  }

  function handleCopyFix(fix) {
    navigator.clipboard?.writeText(fix || '').then(() => {
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    });
  }

  function handleLoadHistoricalScan(scan) {
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

    if (setResults) {
      setResults({
        findings: parsedFindings,
        riskScore: scan.risk_score ?? scan.riskScore ?? 0,
        riskLevel: scan.risk_level ?? scan.riskLevel ?? 'Low',
        scannedAt: scan.scanned_at || scan.scannedAt,
        sourceType: scan.source_type || scan.sourceType || 'Historical Scan',
      });
      setTab('current');
    }
  }

  function handleExportCSV() {
    if (!findings.length) return;
    const header = ['ID', 'Type', 'Category', 'Severity', 'Risk Score', 'Location', 'Explanation', 'Suggested Fix'];
    const rows = scored.map((f, i) => [
      i + 1,
      `"${(f.type || '').replace(/"/g, '""')}"`,
      `"${(f.category || '').replace(/"/g, '""')}"`,
      f.severity || 'Medium',
      (f._score / 10).toFixed(1),
      `"${locationForFinding(f).replace(/"/g, '""')}"`,
      `"${(f.explanation || '').replace(/"/g, '""')}"`,
      `"${(f.fix || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `securecode_scan_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function handlePrintPDF() {
    if (!findings.length) return;

    const dateStr = new Date(results?.scannedAt || Date.now()).toLocaleString();
    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const findingsRows = scored.map((f, i) => {
      const sevColor = f.severity?.toLowerCase() === 'critical' ? '#dc2626' : f.severity?.toLowerCase() === 'high' ? '#ea580c' : f.severity?.toLowerCase() === 'medium' ? '#ca8a04' : '#16a34a';
      const statusColor = f._fixed ? '#16a34a' : '#dc2626';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; text-align: center;">${i + 1}</td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12.5px;">${escapeHtml(f.type || f.category || 'Security Finding')}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(f.cwe || f.category || 'CWE / OWASP')}</div>
          </td>
          <td style="padding: 10px 12px;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; background: ${sevColor}15; color: ${sevColor}; border: 1px solid ${sevColor}40;">
              ${f.severity || 'Medium'}
            </span>
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #475569;">
            ${escapeHtml(locationForFinding(f))}
          </td>
          <td style="padding: 10px 12px;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}40;">
              ${f._fixed ? '✓ FIXED' : '⚠ OPEN'}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 11px; color: #334155; line-height: 1.45;">
            ${escapeHtml(f.fix || f.explanation || 'Apply verified parameterized mitigation.')}
          </td>
        </tr>
      `;
    }).join('');

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SecureCode Audit Report — ${dateStr}</title>
          <style>
            @page { size: A4; margin: 14mm 12mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 20px 24px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .brand {
              font-size: 20px;
              font-weight: 800;
              letter-spacing: -0.02em;
              color: #0f172a;
            }
            .brand span { color: #6366f1; }
            .meta { font-size: 11.5px; color: #475569; text-align: right; line-height: 1.5; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .summary-card {
              background: #f8fafc;
              border: 1.5px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 12px;
            }
            .summary-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .summary-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 3px; }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 20px; }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.05em;
              text-align: left;
              padding: 8px 12px;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .footer {
              margin-top: 28px;
              padding-top: 12px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">🛡️ Secure<span>Code</span> Security Audit Report</div>
              <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">Static Application Security Testing & AI Remediation Summary</div>
            </div>
            <div class="meta">
              <div><strong>Scan Date:</strong> ${dateStr}</div>
              <div><strong>Scope:</strong> ${escapeHtml(results?.sourceType || scanSource)}</div>
              <div><strong>Code Size:</strong> ${code ? code.split('\\n').length : 0} lines</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Security Score</div>
              <div class="summary-value" style="color: ${scoreColor};">${securityScore}/100</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Findings</div>
              <div class="summary-value">${totalIssues}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Remediation Status</div>
              <div class="summary-value" style="color: #10b981;">${fixedCount}/${totalIssues} Fixed</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Risk Level</div>
              <div class="summary-value">${escapeHtml(results?.riskLevel || 'Low')}</div>
            </div>
          </div>

          <div class="section-title">Audit Findings & Verification Log</div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Vulnerability & Category</th>
                <th style="width: 80px;">Severity</th>
                <th style="width: 110px;">Location</th>
                <th style="width: 80px;">Status</th>
                <th>Recommended Fix / Applied Patch</th>
              </tr>
            </thead>
            <tbody>
              ${findingsRows}
            </tbody>
          </table>

          <div class="footer">
            <div>Generated automatically by SecureCode Security Platform • OWASP Top 10 Compliant</div>
            <div>Confidential Document</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 200);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  const scored = findings.map((f, i) => {
    const isFixed = Boolean(fixedMap[i] || f.fixed || f._fixed || f.status === 'fixed');
    return {
      ...f,
      _index: i,
      _score: computeRiskScore(f),
      _fixed: isFixed,
      status: isFixed ? 'fixed' : (f.status || 'open'),
    };
  });

  const critical = scored.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
  const high = scored.filter(f => (f.severity || '').toLowerCase() === 'high').length;
  const medium = scored.filter(f => (f.severity || '').toLowerCase() === 'medium').length;
  const low = scored.filter(f => (f.severity || '').toLowerCase() === 'low').length;
  const fixedCount = scored.filter(f => f._fixed).length;
  const openCount = scored.length - fixedCount;
  const totalIssues = scored.length;
  const remediationPct = totalIssues ? Math.round((fixedCount / totalIssues) * 100) : 0;
  const securityScore = Math.max(0, 100 - (effectiveResults?.risk_score ?? effectiveResults?.riskScore ?? 0));
  const scoreColor = securityScore >= 80 ? '#10b981' : securityScore >= 60 ? '#f59e0b' : '#ef4444';
  const scoreLabel = securityScore >= 80 ? 'Good' : securityScore >= 60 ? 'Fair' : 'At Risk';
  const hasData = Boolean(effectiveResults && (findings.length > 0 || effectiveResults.risk_score !== undefined || effectiveResults.riskScore !== undefined));

  const FILTERS = [
    { key: 'all', label: `All (${totalIssues})` },
    { key: 'critical', label: `Critical (${critical})` },
    { key: 'high', label: `High (${high})` },
    { key: 'medium', label: `Medium (${medium})` },
    { key: 'low', label: `Low (${low})` },
    { key: 'open', label: `Open (${openCount})` },
    { key: 'fixed', label: `Fixed (${fixedCount})` },
  ];

  let filtered = scored;
  if (activeFilter === 'critical') filtered = filtered.filter(f => (f.severity || '').toLowerCase() === 'critical');
  else if (activeFilter === 'high') filtered = filtered.filter(f => (f.severity || '').toLowerCase() === 'high');
  else if (activeFilter === 'medium') filtered = filtered.filter(f => (f.severity || '').toLowerCase() === 'medium');
  else if (activeFilter === 'low') filtered = filtered.filter(f => (f.severity || '').toLowerCase() === 'low');
  else if (activeFilter === 'fixed') filtered = filtered.filter(f => f._fixed);
  else if (activeFilter === 'open') filtered = filtered.filter(f => !f._fixed);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(f => `${f.type || ''} ${f.explanation || ''} ${f.packageName || ''} ${f.category || ''}`.toLowerCase().includes(q));
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const selected = selectedIndex !== null ? scored.find(f => f._index === selectedIndex) : null;

  // History
  const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.scanned_at || b.scannedAt) - new Date(a.scanned_at || a.scannedAt));

  // If repair diff is active, show it
  if (repairData) {
    return (
      <div className="v2-results-wrapper">
        <div className="v2-gen-card v2-repair-modal-card">
          <RepairView
            originalCode={code}
            repairedCode={repairData.repairedCode}
            explanation={repairData.explanation}
            changesCount={repairData.changesCount}
            onAccept={handleAcceptRepair}
            onCancel={() => setRepairData(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="v2-results-wrapper">

      {/* ── Top Header matching Code Scan / Generate Code ── */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag">
            <Sparkles size={13} className="v2-tag-icon" />
            <span>Multi-Engine Security Analysis</span>
          </div>
          <h1>Scan Results</h1>
          <p className="hide-on-mobile">Detailed results of security vulnerabilities found in your most recent scan and generated code.</p>
        </div>

        <div className="v2-results-header-actions">
          {hasData && (
            <>
              <button
                className="v2-action-btn"
                onClick={handlePrintPDF}
                title="Print or save scan audit summary as PDF"
              >
                <Printer size={14} />
                <span>Export PDF</span>
              </button>
              {totalIssues > 0 && (
                <button
                  className="v2-action-btn"
                  onClick={handleExportCSV}
                  title="Export detected vulnerabilities as CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              )}
            </>
          )}
          {hasData && totalIssues > 0 && openCount > 0 && (
            <button
              className="v2-action-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                borderColor: '#10b981',
                color: '#10b981',
                fontWeight: 700
              }}
              onClick={handleFixAll}
              title="Apply secure fixes for all detected vulnerabilities directly to Code Scan"
            >
              <Zap size={14} />
              <span>Fix All ({openCount})</span>
            </button>
          )}
          {hasData && totalIssues > 0 && (
            <button
              className="v2-action-btn v2-btn-repair"
              onClick={handleAutoRepair}
              disabled={isRepairing || scanning || !code?.trim()}
              title="Run automatic patch generator on detected vulnerabilities"
            >
              {isRepairing ? (
                <><Loader2 size={14} className="v2-spin" /><span>Generating Patch...</span></>
              ) : (
                <><Wrench size={14} /><span>Auto Repair</span></>
              )}
            </button>
          )}
          <button
            className="v2-btn-primary"
            onClick={onRescan}
            disabled={scanning || !code?.trim()}
            title="Rescan current code across all detection engines"
          >
            {scanning ? (
              <><Loader2 size={14} className="v2-spin" /><span>Scanning...</span></>
            ) : (
              <><RotateCcw size={14} /><span>Rescan</span></>
            )}
          </button>
        </div>
      </header>

      {repairError && (
        <div className="v2-error-banner">
          <AlertTriangle size={14} />
          <span>{repairError}</span>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="v2-results-tabs">
        <button
          className={`v2-tab ${tab === 'current' ? 'v2-tab-active' : ''}`}
          onClick={() => setTab('current')}
        >
          <ShieldAlert size={14} /> Current Scan Findings
          {hasData && totalIssues > 0 && (
            <span className="v2-tab-count">{totalIssues}</span>
          )}
        </button>

        <button
          className={`v2-tab ${tab === 'generated' ? 'v2-tab-active' : ''}`}
          onClick={() => setTab('generated')}
        >
          <Wand2 size={14} /> AI Generated Code
          {scanSource.includes('Generated') && (
            <span className="v2-tab-count" style={{ background: 'rgba(192, 132, 252, 0.25)', color: '#c084fc' }}>Active</span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════
          TAB 1: CURRENT SCAN FINDINGS
          ══════════════════════════════════════════ */}
      {tab === 'current' && (
        <>
          {/* Empty — no scan run yet */}
          {!hasData && (
            <div className="v2-panel">
              <div className="v2-empty-state">
                <FileText size={32} className="v2-empty-icon" />
                <div className="v2-empty-title">No scan run yet</div>
                <div className="v2-empty-desc">Run a scan from Code Scan or generate code from the AI Generator to see security analysis results here.</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="v2-btn-primary" onClick={() => goToNav('Code Scan')}>
                    <Code2 size={14} /> Go to Code Scan
                  </button>
                  <button className="v2-btn-secondary" onClick={() => goToNav('Generate Code')}>
                    <Wand2 size={14} /> Go to Generate Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clean result */}
          {hasData && totalIssues === 0 && (
            <div className="v2-panel">
              <div className="v2-empty-state">
                <CheckCircle2 size={40} style={{ color: '#10b981' }} />
                <div className="v2-empty-title">All clear! No vulnerabilities detected.</div>
                <div className="v2-empty-desc">Your code passed AST Graph Neural Network, Groq LLM Semantic checks, and Secret pattern scans.</div>
                <div style={{ marginTop: 12 }}>
                  <span className="v2-status-pill v2-status-good">Source: {results?.sourceType || scanSource}</span>
                </div>
              </div>
            </div>
          )}

          {/* Has findings */}
          {hasData && totalIssues > 0 && (
            <>
              {/* ── Metric Cards Grid ── */}
              <section className="v2-metrics-grid">
                <div className="v2-metric-card" style={{ alignItems: 'center' }}>
                  <div className="v2-metric-header" style={{ justifyContent: 'center' }}>
                    <span className="v2-metric-label">Security Score</span>
                  </div>
                  <ScoreRing score={securityScore} color={scoreColor} label={scoreLabel} />
                </div>

                <div className="v2-metric-card">
                  <div className="v2-metric-header">
                    <span className="v2-metric-label">Total Issues</span>
                    <div className="v2-metric-icon v2-icon-red">
                      <ShieldAlert size={16} />
                    </div>
                  </div>
                  <div className="v2-metric-body">
                    <div className="v2-metric-value"><span>{totalIssues}</span></div>
                    <div className="v2-metric-sub">
                      {critical > 0 && <span className="v2-sev-badge v2-badge-critical">{critical} Critical</span>}
                      {high > 0 && <span className="v2-sev-badge v2-badge-high">{high} High</span>}
                    </div>
                  </div>
                </div>

                <div className="v2-metric-card">
                  <div className="v2-metric-header">
                    <span className="v2-metric-label">Remediation Progress</span>
                    <div className="v2-metric-icon v2-icon-green">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div className="v2-metric-body">
                    <div className="v2-metric-value">
                      <span className="v2-val-green">{fixedCount}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>/{totalIssues} Fixed</span>
                    </div>
                    <div className="v2-progress-track" style={{ marginTop: 6 }}>
                      <div className="v2-progress-fill" style={{ width: `${Math.max(0, remediationPct)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="v2-metric-card">
                  <div className="v2-metric-header">
                    <span className="v2-metric-label">Risk Level & Origin</span>
                    <div className="v2-metric-icon v2-icon-amber">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                  <div className="v2-metric-body">
                    <div className="v2-metric-value"><span>{results?.riskScore ?? 0}</span></div>
                    <div className="v2-metric-sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`v2-status-pill ${results?.riskLevel?.toLowerCase() === 'critical' ? 'v2-status-danger' : results?.riskLevel?.toLowerCase() === 'high' ? 'v2-status-warn' : 'v2-status-good'}`}>
                        {results?.riskLevel || 'Low'}
                      </span>
                      <span className="v2-status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', fontSize: 10 }}>
                        {results?.sourceType || scanSource}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Filter Bar & Search ── */}
              <div className="v2-results-filter-bar">
                <div className="v2-filter-chips">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      className={`v2-filter-chip ${activeFilter === f.key ? 'v2-filter-chip-active' : ''}`}
                      onClick={() => { setActiveFilter(f.key); setPage(1); }}
                    >
                      {f.label}
                    </button>
                  ))}
                  {openCount > 0 && (
                    <button
                      className="v2-filter-chip"
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10b981',
                        color: '#10b981',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onClick={handleFixAll}
                      title="Apply fixes for all open vulnerabilities to Code Scan"
                    >
                      <Zap size={12} /> Fix All ({openCount})
                    </button>
                  )}
                </div>
                <div className="v2-results-search-wrap">
                  <Search size={13} className="v2-search-icon" />
                  <input
                    className="v2-results-search"
                    placeholder="Search findings, CVEs, categories..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {/* ── Main Findings Grid: Table + Detail Panel ── */}
              <div className="v2-results-main-grid">
                {/* Findings Table */}
                <div className="v2-panel v2-results-table-panel">
                  <div className="v2-table-responsive">
                    <table className="v2-findings-table">
                      <thead>
                        <tr>
                          <th>Issue / Category</th>
                          <th style={{ width: 100 }}>Severity</th>
                          <th style={{ width: 80 }}>Risk</th>
                          <th style={{ width: 80 }}>Status</th>
                          <th style={{ width: 60 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-faint)', fontSize: 13 }}>
                              No issues match your current filter criteria.
                            </td>
                          </tr>
                        )}
                        {pageItems.map(f => (
                          <tr
                            key={f._index}
                            className={`v2-table-row v2-results-row ${selectedIndex === f._index ? 'v2-results-row-active' : ''}`}
                            onClick={() => setSelectedIndex(f._index)}
                          >
                            <td>
                              <div className="v2-issue-name">{f.type || f.category || 'Security Finding'}</div>
                              <div className="v2-issue-loc">{locationForFinding(f)}</div>
                            </td>
                            <td>
                              <span className={`v2-sev-badge ${sevClass(f.severity)}`}>{f.severity || 'Low'}</span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {(f._score / 10).toFixed(1)}/10
                            </td>
                            <td>
                              <span className={`v2-status-pill ${f._fixed ? 'v2-status-good' : 'v2-status-danger'}`}>
                                {f._fixed ? 'Fixed' : 'Open'}
                              </span>
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <button
                                className="v2-icon-action-btn"
                                onClick={() => toggleFixed(f._index)}
                                title={f._fixed ? 'Mark as open' : 'Mark as fixed'}
                              >
                                {f._fixed ? <AlertTriangle size={13} /> : <Check size={13} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filtered.length > PAGE_SIZE && (
                    <div className="v2-results-pagination">
                      <span className="v2-pagination-info">
                        {(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div className="v2-pagination-btns">
                        <button className="v2-icon-action-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped === 1}>
                          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{pageClamped}/{totalPages}</span>
                        <button className="v2-icon-action-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages}>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detail Panel */}
                <div className="v2-panel v2-results-detail-panel">
                  {!selected ? (
                    <div className="v2-empty-state">
                      <Brain size={28} className="v2-empty-icon" />
                      <div className="v2-empty-title" style={{ fontSize: 13 }}>Select an issue</div>
                      <div className="v2-empty-desc">Click any row in the table to inspect AI remediation details, confidence scores, and code previews.</div>
                    </div>
                  ) : (
                    <div className="v2-detail-content">
                      <div className="v2-detail-header">
                        <div>
                          <div className="v2-detail-title">{selected.type || selected.category || 'Security Finding'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: selected.line ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                color: selected.line ? '#f87171' : '#818cf8',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: selected.line ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                              }}
                            >
                              📍 {selected.line ? `Line ${selected.line}` : 'Source Scope'}
                            </span>
                            <span className="v2-detail-loc" style={{ margin: 0 }}>{locationForFinding(selected)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`v2-sev-badge ${sevClass(selected.severity)}`}>{selected.severity}</span>
                          <button className="v2-icon-action-btn" onClick={() => setSelectedIndex(null)} title="Close detail panel">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* AI Explanation */}
                      <div className="v2-detail-section">
                        <div className="v2-detail-section-title"><Brain size={13} /> AI Security Explanation</div>
                        <div className="v2-detail-body-text">
                          {selected.explanation || 'Vulnerability detected by static security analysis.'}
                        </div>
                        {typeof selected.confidence === 'number' && (
                          <div style={{ marginTop: 10 }}>
                            <div className="v2-progress-label-row" style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Detection Confidence</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{Math.round(selected.confidence * 100)}%</span>
                            </div>
                            <div className="v2-progress-track">
                              <div className="v2-progress-fill" style={{ width: `${Math.round(selected.confidence * 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Side-by-Side Line Code Diff: Vulnerable vs Corrected ── */}
                      <div className="v2-detail-section">
                        <div className="v2-detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Code2 size={13} /> Code Analysis & Corrected Fix
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                          {/* Left: Flagged Vulnerable Code */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🔴 Vulnerable Code {selected.line ? `(Line ${selected.line})` : ''}</span>
                            </div>
                            <pre
                              style={{
                                background: '#1c1316',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                color: '#fca5a5',
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                lineHeight: 1.45,
                                margin: 0,
                                maxHeight: '180px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {getVulnerableSnippet(selected, code)}
                            </pre>
                          </div>

                          {/* Right: Corrected / Repaired Code */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>🟢 Corrected Secure Code</span>
                              <button
                                onClick={() => handleCopyFix(getCorrectedSnippet(selected, code))}
                                style={{
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  border: '1px solid rgba(52, 211, 153, 0.3)',
                                  borderRadius: '4px',
                                  color: '#34d399',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '1px 6px',
                                }}
                              >
                                {copiedFix ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre
                              style={{
                                background: '#0e1f18',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                color: '#86efac',
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                lineHeight: 1.45,
                                margin: 0,
                                maxHeight: '180px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {getCorrectedSnippet(selected, code)}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Remediation Summary */}
                      <div className="v2-detail-section">
                        <div className="v2-detail-section-title"><Wrench size={13} /> Recommended Remediation</div>
                        <div className="v2-detail-body-text">
                          {selected.fix || 'Sanitize external inputs, enforce authentication checks, and remove hardcoded secrets.'}
                        </div>
                      </div>

                      {/* RAG Knowledge & Mitigation Reference */}
                      <div
                        style={{
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Brain size={13} /> 📚 Security Standards
                          </span>
                          <span>{selected.cwe || 'OWASP Standard'}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                          Grounded with verified OWASP Top 10 mitigation guidelines and parameterized security rules.
                        </div>
                        <button
                          onClick={() => goToNav('Security Copilot')}
                          style={{
                            alignSelf: 'flex-start',
                            background: 'none',
                            border: 'none',
                            color: '#c084fc',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 0 0',
                          }}
                        >
                          Ask Security Copilot about this issue →
                        </button>
                      </div>

                      {/* Toast notification when fix is applied */}
                      {applyToast && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          borderRadius: '7px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Check size={14} /> {applyToast}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="v2-detail-actions">
                        <button
                          className="v2-action-btn v2-btn-repair"
                          style={{
                            flex: 1.2,
                            justifyContent: 'center',
                            background: (selected._fixed || fixedMap[selected._index]) ? 'rgba(16, 185, 129, 0.15)' : undefined,
                            borderColor: (selected._fixed || fixedMap[selected._index]) ? '#10b981' : undefined
                          }}
                          onClick={() => toggleFixed(selected._index)}
                        >
                          {(selected._fixed || fixedMap[selected._index]) ? (
                            <><Check size={14} style={{ color: '#10b981' }} /> Fixed in Code</>
                          ) : (
                            <><Wrench size={14} /> Apply Fix to Code</>
                          )}
                        </button>
                        <button
                          className="v2-action-btn v2-btn-copy"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => handleCopyFix(getCorrectedSnippet(selected, code))}
                        >
                          {copiedFix ? <><Check size={13} style={{ color: '#10b981' }} /> Copied</> : <><Copy size={13} /> Copy Fix</>}
                        </button>
                        <button
                          className="v2-action-btn v2-btn-analyze"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => goToNav('Code Scan')}
                        >
                          <ExternalLink size={13} /> View in Code Scan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: AI GENERATED CODE
          ══════════════════════════════════════════ */}
      {tab === 'generated' && (
        <div className="v2-panel">
          {!code?.trim() ? (
            <div className="v2-empty-state">
              <Wand2 size={32} className="v2-empty-icon" />
              <div className="v2-empty-title">No AI code generated in this session</div>
              <div className="v2-empty-desc">Head to the Generate Code tab to create secure code using Groq LLM with few-shot memory.</div>
              <button className="v2-btn-primary" style={{ marginTop: 14 }} onClick={() => goToNav('Generate Code')}>
                <Wand2 size={14} /> Go to Generate Code
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                    Active Generated Code Snippet
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Source: {scanSource} • {code.split('\n').length} lines • {code.length} characters
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="v2-action-btn v2-btn-repair" onClick={handleAutoRepair} disabled={isRepairing}>
                    <Wrench size={14} /> Auto-Repair
                  </button>
                  <button className="v2-btn-primary" onClick={onRescan} disabled={scanning}>
                    <RotateCcw size={14} /> Rescan Generated Code
                  </button>
                </div>
              </div>

              <pre className="v2-detail-code" style={{ maxHeight: 350, overflowY: 'auto' }}>
                {code}
              </pre>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="v2-btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                  }}
                >
                  <Copy size={13} /> Copy Generated Code
                </button>
                <button
                  className="v2-btn-secondary"
                  onClick={() => setTab('current')}
                >
                  <ShieldAlert size={13} /> View {totalIssues} Scan Finding{totalIssues !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
