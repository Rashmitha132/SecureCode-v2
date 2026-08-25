// SecurityCopilotDrawer.jsx
// Floating Slide-Out AI Security Assistant Drawer with Strict Project Scope, LocalStorage Cache Fallback & Prioritized Remediation

import React, { useState, useRef, useEffect } from 'react';
import {
  Brain, Send, Sparkles, ShieldCheck, Code2, Copy, Check,
  Bot, User, AlertTriangle, KeyRound, Lock, X, Trash2,
  ChevronRight, RefreshCw, MessageSquare, Terminal, Cpu, Layers
} from 'lucide-react';
import { getScanName } from './scanNameUtil';

const API_URL = 'http://localhost:4000';

const DRAWER_SUGGESTIONS = [
  {
    icon: ShieldCheck,
    label: 'Audit Scan Findings',
    query: 'Analyze the security vulnerabilities from my current project scan and tell me what to fix first.',
  },
  {
    icon: Code2,
    label: 'Review Active Code',
    query: 'Inspect my active scanned code and identify any insecure logic or parameter flaws.',
  },
  {
    icon: Lock,
    label: 'Patch Vulnerabilities',
    query: 'Show me the secure code fix for the most critical finding in my scanned project.',
  },
  {
    icon: KeyRound,
    label: 'Check for Secrets',
    query: 'Did the scanner find any hardcoded API keys, tokens, or plaintext credentials in my project?',
  },
];

function renderInline(text) {
  if (!text) return null;
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#3ba7f0',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} style={{ color: 'var(--text)', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedDrawerMessage({ content }) {
  if (!content) return null;
  const rawParts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rawParts.map((part, pIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*?)```$/);
          const lang = match ? match[1] || 'code' : 'code';
          const codeSnippet = match ? match[2].trim() : part.slice(3, -3).trim();

          return (
            <div
              key={pIdx}
              style={{
                background: '#090b10',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                overflow: 'hidden',
                margin: '4px 0',
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '4px 10px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{lang}</span>
                <span
                  onClick={() => navigator.clipboard?.writeText(codeSnippet)}
                  style={{ cursor: 'pointer', color: '#3ba7f0' }}
                >
                  Copy
                </span>
              </div>
              <pre
                style={{
                  padding: '8px 10px',
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {codeSnippet}
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={pIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {lines.map((line, lIdx) => {
              if (line.startsWith('### ')) {
                return (
                  <h4 key={lIdx} style={{ fontSize: '13px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--text)' }}>
                    {line.replace('### ', '')}
                  </h4>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={lIdx} style={{ fontSize: '14px', fontWeight: 800, margin: '8px 0 4px', color: '#3ba7f0' }}>
                    {line.replace('## ', '')}
                  </h3>
                );
              }
              if (line.startsWith('* ') || line.startsWith('- ')) {
                return (
                  <div key={lIdx} style={{ display: 'flex', gap: '6px', fontSize: '12px', lineHeight: 1.5 }}>
                    <span style={{ color: '#3ba7f0' }}>•</span>
                    <div>{renderInline(line.slice(2))}</div>
                  </div>
                );
              }
              if (line.startsWith('> ')) {
                return (
                  <blockquote key={lIdx} style={{ margin: '4px 0', padding: '6px 10px', background: 'rgba(59, 167, 240, 0.08)', borderLeft: '3px solid #3ba7f0', borderRadius: '4px', fontSize: '11.5px', color: 'var(--text)' }}>
                    {renderInline(line.slice(2))}
                  </blockquote>
                );
              }
              if (line.trim().length === 0) return null;
              return (
                <p key={lIdx} style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--text)' }}>
                  {renderInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function SecurityCopilotDrawer({
  isOpen,
  onClose,
  results,
  code,
  history = [],
  activeNav = '',
  goToNav
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 **Hello! I am your Project Security Auditor.**\n\nI am fine-tuned exclusively to audit your scanned code, explain project findings, and provide verified security patches. How can I help secure your project?",
      timestamp: 'Now',
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fallback to localStorage if history prop is currently empty
  let effectiveHistory = Array.isArray(history) && history.length > 0 ? history : [];
  if (effectiveHistory.length === 0) {
    try {
      const cached = localStorage.getItem('sc_local_history');
      if (cached) {
        effectiveHistory = JSON.parse(cached);
      }
    } catch (e) {}
  }

  const activeFindings = results?.findings || [];
  const findingsCount = activeFindings.length;

  // Compute History Metrics
  const totalScans = effectiveHistory.length;
  const avgScore = totalScans > 0
    ? Math.round(effectiveHistory.reduce((acc, s) => acc + Math.max(0, 100 - (s.risk_score ?? s.riskScore ?? 0)), 0) / totalScans)
    : 0;
  const highRiskCount = effectiveHistory.filter(s => {
    const r = (s.risk_level || s.riskLevel || '').toLowerCase();
    return r === 'critical' || r === 'high';
  }).length;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Strict Project-Only Scope & Contextual Reasoning Engine
  function generateClientAnswer(q) {
    const qLower = q.toLowerCase();

    // 1. Decline inquiries regarding internal architecture, techstack, build details, or training
    const isBuildOrArchQuery =
      /\b(how\s*(were|was)\s*(you|u|this|it)\s*(built|made|created|trained|designed)|how\s*(do|does)\s*(you|u|it)\s*work|architecture|tech\s*stack|technology\s*stack|gnn|graph\s*neural|dataset|training|pipeline|model\s*weights|system\s*prompt|source\s*code\s*of\s*(this|securecode)|backend|database\s*schema)\b/i.test(qLower) ||
      qLower.includes('how u were built') ||
      qLower.includes('how were you built') ||
      qLower.includes('how was this made') ||
      qLower.includes('tell me how u were built') ||
      qLower.includes('techstack') ||
      qLower.includes('tech stack') ||
      qLower.includes('what technologies');

    if (isBuildOrArchQuery) {
      return {
        answer: "🔒 **I'm sorry, but I cannot help you with that.**\n\nI am fine-tuned exclusively to audit your project code, explain vulnerability findings, and provide security remediation patches for your codebase.\n\n*Please feel free to ask me about your scanned code, vulnerability findings, or how to fix issues in your project!*",
      };
    }

    // 2. Identity Inquiry ("who are you", "who r u", "introduce yourself")
    const isIdentity =
      /\b(who\s*(are|r)\s*(you|u)|who\s*u\s*(are|r)|what\s*is\s*your\s*name|what\s*(are|r)\s*(you|u)|introduce\s*yourself|what\s*is\s*your\s*purpose)\b/i.test(qLower) ||
      qLower.startsWith('who r u') ||
      qLower.startsWith('who are you') ||
      qLower.startsWith('who are u') ||
      qLower.startsWith('who r you') ||
      qLower === 'hi' || qLower === 'hello' || qLower === 'hey';

    if (isIdentity) {
      return {
        answer: "👋 I am **SecureCode Assistant**, your dedicated AI DevSecOps and code auditing companion.\n\nI am designed to help developers identify vulnerabilities, audit connected GitHub repositories, explain security risks, and provide verified auto-repair patches to keep your codebase secure.\n\n*Ask me: \"How can you help me?\", \"Audit my active code\", or \"How do I fix my scan findings?\"*",
      };
    }

    // 3. Help, Capabilities & Walkthrough Inquiry ("how can you help me", "how can u help", "what can you do", "help me")
    const isHelpQuery =
      /\b(what\s*(can|do)\s*(you|u)\s*do|what\s*do\s*u\s*do|what\s*can\s*u\s*do|how\s*(can|do)\s*(you|u)\s*help|how\s*to\s*use|help\s*me|assist\s*me)\b/i.test(qLower) ||
      qLower.includes('how can u help') ||
      qLower.includes('how can you help') ||
      qLower.includes('how do you help') ||
      qLower.includes('how do u help') ||
      qLower === 'help';

    if (isHelpQuery) {
      return {
        answer: `👋 **Here is how I can assist you with your project & connected GitHub repositories:**\n\n### 🛡️ 1. Step-by-Step Vulnerability Remediation:\n* Provide **actionable, line-by-line steps on how to fix detected vulnerabilities** (such as SQL Injection, Cross-Site Scripting, exposed API keys/passwords, insecure eval, and command injection).\n* Deliver **verified, copy-ready code patches** and unified diffs directly tailored to your files.\n\n### 📂 2. Walk You Through Your Project & Connected GitHub Repos:\n* Walk you through **auditing your connected GitHub / GitLab repositories** to identify vulnerable modules and dependency risks across branches.\n* Help you review pull requests for security flaws before merging into production.\n\n### ⚡ 3. Guide You Through Security Workflows:\n* Explain scan findings in **Scan Results**, audit live snippets in **Code Scan**, and track security score improvements in **Learning Progress**.\n\n*Ask me: "How do I fix the findings?", "Audit my active code", or "Check for exposed credentials in my project!"*`,
      };
    }

    // 4. Code Generation Request Inquiry -> Direct to Generate Code tab
    const isGenCodeQuery =
      (
        /\b(generate|write|create|synthesize|build|give me|make|code me|script me)\b/i.test(qLower) &&
        /\b(code|python|javascript|java|c\+\+|html|css|sql|script|function|program|app|api|login|auth|calculator|count|loop|numbers|snippet)\b/i.test(qLower)
      ) ||
      qLower.startsWith('generate') ||
      qLower.startsWith('write') ||
      qLower.startsWith('create') ||
      qLower.includes('generate code') ||
      qLower.includes('write code') ||
      qLower.includes('create code') ||
      qLower.includes('can u generate') ||
      qLower.includes('can you generate') ||
      qLower.includes('help me to generate code') ||
      qLower.includes('help me generate code');

    if (isGenCodeQuery) {
      return {
        answer: "💡 **I cannot help with generating code directly here.**\n\nHowever, you can navigate to the **Generate Code** tab in the sidebar where you can generate code using our AI Code Synthesizer.\n\nOnce generated, you can click **'Analyze in Code Scan'** to run the security audit, and then return here so I can **help you analyze that code and explain any vulnerability findings!**",
      };
    }

    // 5. Prioritized Vulnerability Audit ("Analyze the security vulnerabilities", "what to fix first", "prioritize")
    const isPrioritizeQuery =
      qLower.includes('what to fix first') ||
      qLower.includes('tell me what to fix first') ||
      qLower.includes('analyze the security vulnerabilities') ||
      qLower.includes('fix priority') ||
      qLower.includes('prioritize');

    if (isPrioritizeQuery) {
      // Case A: Findings in active code scan
      if (findingsCount > 0) {
        let txt = `🚨 **Prioritized Vulnerability Remediation Guide (${findingsCount} finding${findingsCount > 1 ? 's' : ''}):**\n\n`;
        activeFindings.forEach((f, idx) => {
          txt += `### ${idx + 1}. **${f.type}** (Line ${f.line || 1}) — *${f.severity || 'High'} Severity*\n`;
          txt += `* **CWE / Standard:** ${f.cwe || 'CWE-89'}\n`;
          txt += `* **Fix Action:** ${f.fix || 'Apply secure parameterization and input sanitization.'}\n`;
          if (f.correctedCode) {
            txt += `\`\`\`javascript\n${f.correctedCode}\n\`\`\`\n\n`;
          }
        });
        txt += `💡 **Recommended Next Step:** Click **"⚡ Auto-Repair"** in **Scan Results** to review and apply unified diffs!`;
        return { answer: txt };
      }

      // Case B: Check latest scan in history
      if (effectiveHistory.length > 0) {
        const latest = effectiveHistory[0];
        const latestFindings = latest.findings || [];
        const latestScore = Math.max(0, 100 - (latest.risk_score ?? latest.riskScore ?? 0));

        if (latestFindings.length > 0) {
          let txt = `📊 **Auditing Latest Recorded Project Scan (#${latest.id || latest.snippet_hash || 'Latest'} • Score: ${latestScore}/100):**\n\n`;
          txt += `🚨 **Fix Priority Order:**\n\n`;
          latestFindings.forEach((f, idx) => {
            txt += `${idx + 1}. **${f.type}** (Line ${f.line || 1}) — *${f.severity || 'High'} Severity*\n   > **Fix:** ${f.fix || 'Sanitize input.'}\n\n`;
          });
          txt += `To inspect the full code diff for this scan, go to **Scan History** and click **Inspect Scan**!`;
          return { answer: txt };
        }
      }

      // Case C: Clean code or no scans yet
      if (code && code.trim().length > 0) {
        return {
          answer: "✨ **Your active code scan is clean!**\n\nYour latest scan shows **0 detected vulnerabilities** and a **100/100 Security Score**. No immediate security fixes are needed.",
        };
      }

      return {
        answer: "📋 **No Active Code Scanned Yet**\n\nTo audit your vulnerabilities and get a prioritized remediation guide:\n1. Go to the **Code Scan** tab.\n2. Paste your code snippet or upload a project file.\n3. Click **Scan Code**.\n\nOnce scanned, ask me here and I will immediately rank your flaws and show you what to fix first!",
      };
    }

    // 6. Secret & API Key Inquiries for Project & History
    if (qLower.includes('secret') || qLower.includes('api key') || qLower.includes('token') || qLower.includes('password') || qLower.includes('credential')) {
      const activeSecrets = activeFindings.filter(f => f.type?.toLowerCase().includes('key') || f.type?.toLowerCase().includes('token') || f.type?.toLowerCase().includes('password') || f.type?.toLowerCase().includes('secret') || f.method === 'pattern');

      const historySecrets = [];
      effectiveHistory.forEach((s) => {
        (s.findings || []).forEach((f) => {
          if (f.type?.toLowerCase().includes('key') || f.type?.toLowerCase().includes('token') || f.type?.toLowerCase().includes('password') || f.type?.toLowerCase().includes('secret') || f.method === 'pattern') {
            historySecrets.push({ scanId: s.id || s.snippet_hash || 'Recent', type: f.type, line: f.line, match: f.matchPreview || '***' });
          }
        });
      });

      if (activeSecrets.length > 0) {
        let txt = `🔑 **${activeSecrets.length} Exposed Secret(s) Found in Active Code:**\n\n`;
        activeSecrets.forEach((s, idx) => {
          txt += `${idx + 1}. **${s.type}** at Line ${s.line} (\`${s.matchPreview || '***'}\`)\n   *Fix:* Replace with environment variable (e.g. \`process.env.DB_PASSWORD\` or \`os.environ.get('DB_PASSWORD')\`).\n\n`;
        });
        return { answer: txt };
      }

      if (historySecrets.length > 0) {
        let txt = `🔑 **Found ${historySecrets.length} Secret(s) in Your Project Scan History:**\n\n`;
        historySecrets.slice(0, 4).forEach((s, idx) => {
          txt += `${idx + 1}. **${s.type}** in Scan \`#${s.scanId}\` (Line ${s.line})\n   *Fix:* Rotate key and move to secrets manager.\n\n`;
        });
        return { answer: txt };
      }

      return {
        answer: `🔒 **No Leaked Secrets or Plaintext Credentials Detected across your active workspace or recorded scan history (${totalScans} scans).**\n\nTo ensure your project remains secure, always inject keys through \`.env\` files or secret vaults like AWS Secrets Manager. Never commit keys to Git repositories.`
      };
    }

    // 7. Recent Scan Details Inquiry ("which was my recent scan", "what was my last scan", "recent scan", "latest scan")
    const isRecentScanQuery =
      /\b(recent\s*scan|last\s*scan|latest\s*scan|previous\s*scan)\b/i.test(qLower) ||
      qLower.includes('which was my recent scan') ||
      qLower.includes('what was my recent scan') ||
      qLower.includes('what was my last scan') ||
      qLower.includes('my recent scan') ||
      qLower.includes('my last scan') ||
      qLower.includes('tell me about my recent scan') ||
      qLower.includes('details of my recent scan');

    if (isRecentScanQuery) {
      // Look for active scan or latest scan in effective history
      const recent = (results && (results.findings || results.risk_score !== undefined))
        ? results
        : (effectiveHistory.length > 0 ? effectiveHistory[0] : null);

      if (!recent) {
        return {
          answer: "📋 **No Scans Recorded Yet**\n\nYou haven't run any scans in this session yet. Head over to **Code Scan**, paste your code snippet or upload a file, and click **Scan Code** to run your first audit!",
        };
      }

      const scanName = getScanName(recent);
      const scanId = recent.id || recent.snippet_hash || (recent.scanned_at ? `Scan @ ${new Date(recent.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Latest Scan');
      const scanFindings = recent.findings || [];
      const count = recent.total_findings ?? scanFindings.length;
      const score = Math.max(0, 100 - (recent.risk_score ?? recent.riskScore ?? 0));
      const risk = recent.risk_level || recent.riskLevel || (score < 50 ? 'High' : score < 80 ? 'Medium' : 'Low');
      const source = recent.source || recent.source_type || 'Source Code';
      const scanDate = recent.scanned_at || recent.scannedAt || recent.timestamp ? new Date(recent.scanned_at || recent.scannedAt || recent.timestamp).toLocaleString() : 'Recent';

      let reply = `📊 **Details of Your Most Recent Scan:**\n\n`;
      reply += `* **Scan Name:** **${scanName}** (\`#${scanId}\`)\n`;
      reply += `* **Source:** **${source}**\n`;
      reply += `* **Security Score:** **${score}/100** (${risk} Risk)\n`;
      reply += `* **Timestamp:** ${scanDate}\n\n`;

      if (count > 0) {
        reply += `### 🚨 Vulnerability Status: **${count} Issue${count > 1 ? 's' : ''} Detected**\n\n`;
        scanFindings.forEach((f, idx) => {
          reply += `${idx + 1}. **${f.type || 'Vulnerability'}** at Line ${f.line || 1} — *${f.severity || 'High'} Severity*\n`;
          reply += `   * **Standard:** ${f.cwe || 'OWASP Top 10'}\n`;
          reply += `   * **Fix Status:** ⚠️ **Pending Patch** (Auto-repair patch available)\n`;
          reply += `   * **Fix Recommendation:** ${f.fix || 'Apply parameterization.'}\n\n`;
        });
        reply += `💡 **Next Step to Fix:** Navigate to the **Scan Results** tab and click **"⚡ Auto-Repair"** to apply the verified secure patch!`;
      } else {
        reply += `### ✨ Vulnerability Status: **Clean (0 Defects Found)**\n\n`;
        reply += `* **Fix Status:** ✅ **Fully Secure / No Patches Needed**\n`;
        reply += `* **Summary:** The code achieved a flawless **100/100 rating** with zero security vulnerabilities, secrets, or parameter flaws detected.`;
      }

      return { answer: reply };
    }

    // 8. Scan History & Project Metrics Inquiry
    if (qLower.includes('history') || qLower.includes('past scan') || qLower.includes('total scan') || activeNav === 'Scan History') {
      if (totalScans > 0) {
        return {
          answer: `📊 **Project Scan History Overview (${totalScans} Scans Recorded):**\n\n* **Total Scans Recorded:** **${totalScans}**\n* **Average Security Score:** **${avgScore}/100**\n* **High / Critical Risk Scans:** **${highRiskCount}**\n\n${highRiskCount > 0 ? `⚠️ **Attention:** You have ${highRiskCount} scan(s) flagged with High or Critical risks. Click on any record in **Scan History** or go to **Scan Results** to review and auto-patch them!` : '✨ All recorded scans are in good standing!'}`,
        };
      }
    }

    // 8. Fix & Patch Requests for Project Findings
    const isFixQuery =
      /\b(how\s*(to|can\s*i|do\s*i)\s*(fix|patch|remediate|resolve|repair))\b/i.test(qLower) ||
      qLower.includes('how to fix') || qLower.includes('how to patch') || qLower.includes('fix it') || qLower.includes('patch this') || qLower.includes('remediate');

    if (isFixQuery) {
      if (findingsCount === 0) {
        return {
          answer: "✨ **Your project code is clean!**\n\nYour active workspace has **0 detected vulnerabilities** and a **100/100 Security Score**. No code modifications are needed for this snippet.",
        };
      }

      const f = activeFindings[0];
      const fType = f.type || 'Security Finding';
      const fLine = f.line || 1;
      const fCorrected = f.correctedCode || 'const query = "SELECT * FROM users WHERE username = ?";';
      const fFix = f.fix || 'Use parameterized placeholders and environment variables.';

      return {
        answer: `🛠️ **Suggested Security Patch for ${fType} (Line ${fLine}):**\n\n\`\`\`javascript\n${fCorrected}\n\`\`\`\n\n> **Remediation Note:** ${fFix}\n\nYou can also click **"⚡ Auto-Repair"** in the **Scan Results** page to review a full unified diff!`,
      };
    }

    // 9. SQL Injection & Database Inquiries
    if (qLower.includes('sql') || qLower.includes('injection') || qLower.includes('sqli') || qLower.includes('database')) {
      return {
        answer: `🛡️ **SQL Injection (CWE-89 • OWASP A03) Remediation:**\n\nSQL Injection happens when untrusted user input is directly concatenated or interpolated into database queries without sanitization.\n\n### ❌ Vulnerable Insecure Pattern (Template String / Concat):\n\`\`\`javascript\nconst query = \`SELECT * FROM users WHERE username = '\${username}'\`;\ndb.query(query, (err, results) => { ... });\n\`\`\`\n\n### ✅ Remediated Secure Pattern (Parameterized Prepared Statement):\n\`\`\`javascript\nconst query = "SELECT * FROM users WHERE username = ?";\ndb.query(query, [username], (err, results) => { ... });\n\`\`\`\n\n**Key Rule:** Never concatenate raw inputs into query strings. Always use parameterized placeholders (\`?\` or \`%s\`) or an ORM (like Prisma / SQLAlchemy).`,
      };
    }

    // 10. Cross-Site Scripting (XSS)
    if (qLower.includes('xss') || qLower.includes('cross-site') || qLower.includes('html')) {
      return {
        answer: `🛡️ **Cross-Site Scripting (XSS • CWE-79) Remediation:**\n\nXSS allows attackers to execute arbitrary scripts in victim browsers, leading to cookie theft and session hijacking.\n\n### ✅ Prevention Steps:\n* Sanitize HTML using **DOMPurify** before rendering.\n* Avoid \`dangerouslySetInnerHTML\` or raw \`innerHTML\`.\n* Set \`Content-Security-Policy\` (CSP) headers on your web server.`,
      };
    }

    // 11. General Active Workspace Audit
    const isAuditQuery =
      qLower.includes('audit') || qLower.includes('review') || qLower.includes('scan') ||
      qLower.includes('finding') || qLower.includes('vulnerabilit') || qLower.includes('inspect') ||
      qLower.includes('check my code') || qLower.includes('check code') || qLower.includes('active code');

    if (isAuditQuery) {
      return {
        answer: `🛡️ **Workspace Security Overview:**\n\n* **Active Code:** ${code ? `Auditing ${code.split('\n').length} lines of code.` : 'No code currently pasted in Code Scan.'}\n* **Active Vulnerabilities:** **${findingsCount} finding(s) detected**.\n* **Scan History:** ${totalScans} scans recorded (Avg Score: ${avgScore}/100).\n\n${findingsCount > 0 ? `### 🔍 Immediate Action Required:\nFound **${activeFindings[0]?.type}** at Line ${activeFindings[0]?.line || 1}. Ask me *"how to fix this"* to see the exact patch snippet!` : 'Your active code currently has zero detected flaws. Feel free to paste any snippet into **Code Scan** and ask me to audit it!'}`,
      };
    }

    // 12. Strict Polite Decline for ALL other off-topic, general knowledge, or unrelated queries
    return {
      answer: "🔒 **I'm sorry, but I can only assist with questions directly related to auditing and securing your project.**\n\nI am fine-tuned exclusively to inspect your scanned code, explain detected security vulnerabilities (like SQLi, XSS, and exposed secrets), and provide verified remediation patches for your codebase.\n\n*Please feel free to ask me to audit your active code, explain your scan findings, or provide a secure patch for a vulnerability!*",
    };
  }

  async function handleSend(customText) {
    const text = customText || query;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      let botResp = null;
      try {
        const res = await fetch(`${API_URL}/api/rag/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: text.trim(),
            codeContext: code || '',
            scanFindings: results?.findings || [],
            chatHistory: messages.slice(-4),
          }),
        });
        if (res.ok) {
          botResp = await res.json();
        }
      } catch (e) {}

      if (!botResp || !botResp.answer) {
        botResp = generateClientAnswer(text.trim());
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: botResp.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: "🔒 **I'm sorry, but I can only assist with questions directly related to auditing and securing your project.**\n\nPlease feel free to ask me to audit your active code, explain your scan findings, or provide a secure patch for a vulnerability!",
          timestamp: 'Scope Guard',
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent Backdrop for outside click */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}
      />

      {/* Slide-out Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(460px, 94vw)',
          height: '100vh',
          background: 'var(--panel)',
          borderLeft: '1px solid var(--border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          fontFamily: "'Inter', system-ui, sans-serif",
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 167, 240, 0.2), rgba(124, 110, 232, 0.2))',
                border: '1px solid rgba(59, 167, 240, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3ba7f0',
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                AI Security Copilot
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                  }}
                >
                  Auditor
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                {findingsCount > 0 ? `${findingsCount} project findings in context` : `${totalScans} scans recorded in registry`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setMessages([messages[0]])}
              title="Clear Chat History"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              title="Close Copilot"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Chat Messages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isUser ? 'linear-gradient(135deg, #7c6ee8, #d94fc0)' : 'var(--panel-2)',
                    border: `1px solid ${isUser ? 'transparent' : 'var(--border)'}`,
                    color: isUser ? '#fff' : '#3ba7f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isUser ? <User size={13} /> : <Bot size={13} />}
                </div>

                <div
                  style={{
                    maxWidth: '84%',
                    background: isUser ? 'linear-gradient(135deg, rgba(124, 110, 232, 0.2), rgba(59, 167, 240, 0.2))' : 'var(--panel-2)',
                    border: `1px solid ${isUser ? 'rgba(124, 110, 232, 0.4)' : 'var(--border)'}`,
                    borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                    padding: '10px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <FormattedDrawerMessage content={m.content} />
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: '#3ba7f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={13} />
              </div>
              <div
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px 12px 12px 12px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={13} className="spin-icon" />
                <span>Auditing project code...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Drawer Bottom Input & Quick Suggestions */}
        <div
          style={{
            padding: '10px 14px 12px',
            borderTop: '1px solid var(--border)',
            background: 'var(--panel-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Quick Suggestion Pills (Arranged in 2 neat lines, 100% visible) */}
          <div
            className="copilot-drawer-pills-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              width: '100%',
            }}
          >
            {DRAWER_SUGGESTIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(s.query)}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={12} style={{ color: '#3ba7f0', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Copilot about your scanned code or findings..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12.5px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              style={{
                padding: '8px 14px',
                background: query.trim() ? 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 100%)' : 'var(--panel)',
                border: '1px solid var(--border)',
                color: query.trim() ? '#fff' : 'var(--text-faint)',
                borderRadius: '8px',
                cursor: query.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={15} />
            </button>
          </form>
          <div style={{ fontSize: '10.5px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '6px' }}>
            SecureCode Project Security Auditor
          </div>
        </div>
      </div>
    </>
  );
}
