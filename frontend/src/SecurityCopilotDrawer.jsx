// SecurityCopilotDrawer.jsx
// Floating Slide-Out AI Security Assistant Drawer with Full Knowledge Base

import React, { useState, useRef, useEffect } from 'react';
import {
  Brain, Send, Sparkles, ShieldCheck, Code2, Copy, Check,
  Bot, User, AlertTriangle, KeyRound, Lock, X, Trash2,
  ChevronRight, RefreshCw, MessageSquare, Terminal, Cpu, Layers
} from 'lucide-react';

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
    label: 'How to Patch Vulnerabilities',
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

export default function SecurityCopilotDrawer({ isOpen, onClose, results, code, goToNav }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 **Hello! I am your AI Security Copilot.**\n\nI am connected to your active code and scan results. Ask me how to fix vulnerabilities, explain CWE/OWASP risks, or learn how SecureCode's 4-tier engine was built!",
      timestamp: 'Now',
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const activeFindings = results?.findings || [];
  const findingsCount = activeFindings.length;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Intelligent Contextual Knowledge Base & Fallback Reasoning Engine
  function generateClientAnswer(q) {
    const qLower = q.toLowerCase();

    // 1. Identity & Purpose ("who are you", "who r u", "what is your name", "hello", "hi")
    if (
      /\b(who\s*(are|r)\s*(you|u)|who\s*u\s*(are|r)|what\s*(are|r)\s*(you|u)|what\s*(is|are)\s*this|what\s*(can|do)\s*(you|u)\s*do|introduce\s*yourself|what\s*is\s*your\s*purpose|what\s*do\s*u\s*do|what\s*can\s*u\s*do|who\s*made\s*you)\b/i.test(qLower) ||
      qLower === 'hi' || qLower === 'hello' || qLower === 'hey' || qLower === 'who r u' || qLower === 'who are you'
    ) {
      return {
        answer: "👋 I am **SecureCode AI Copilot**, an autonomous DevSecOps and code auditing assistant designed to help developers write and deploy bulletproof software.\n\n### 🛡️ What I Can Do:\n* **Live Code Audits:** Scan and explain vulnerabilities in your source code across 9 languages.\n* **OWASP & CWE Mapping:** Categorize risks with industry standards (e.g. SQLi, XSS, RCE, Leaked Secrets).\n* **Instant 1-Click Auto-Repair:** Propose line-by-line secure patches that you can apply with one click.\n* **Interactive Q&A:** Answer any question about your codebase, security best practices, and vulnerability mitigations!",
      };
    }

    // 2. Questions about how it was built / architecture / model internals / system prompt -> Decline politely
    if (
      /\b(how\s*(were|was)\s*(you|u|this|it)\s*(built|made|created|trained)|how\s*(do|does)\s*(you|u|it)\s*work|architecture|tech\s*stack|gnn|graph\s*neural|dataset|training|pipeline|system\s*prompt)\b/i.test(qLower) ||
      qLower.includes('how u were built') || qLower.includes('how was this made') || qLower.includes('tell me how u were built') || qLower.includes('how were you built')
    ) {
      return {
        answer: "🔒 **I'm sorry, but I cannot help you with that.**\n\nI am fine-tuned exclusively to audit your project code, explain vulnerability findings, and provide security remediation patches for your codebase.\n\n*Please feel free to ask me about your scanned code, vulnerability findings, or how to fix issues in your project!*",
      };
    }

    // 3. Fix & Patch Request ("how to fix", "how to patch", "how do i fix", "remediate")
    if (
      /\b(how\s*(to|can\s*i|do\s*i)\s*(fix|patch|remediate|resolve|repair))\b/i.test(qLower) ||
      qLower.includes('how to fix') || qLower.includes('how to patch') || qLower.includes('fix it') || qLower.includes('patch this')
    ) {
      if (findingsCount === 0) {
        return {
          answer: "✨ **Your code is already clean!**\n\nYour active workspace has **0 detected vulnerabilities** and a **100/100 Security Score**. No code modifications are needed.",
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

    // 4. Secret & API Key Inquiries
    if (qLower.includes('secret') || qLower.includes('api key') || qLower.includes('token') || qLower.includes('password') || qLower.includes('credential')) {
      const secrets = activeFindings.filter(f => f.type?.toLowerCase().includes('key') || f.type?.toLowerCase().includes('token') || f.type?.toLowerCase().includes('password') || f.type?.toLowerCase().includes('secret') || f.method === 'pattern');
      if (secrets.length > 0) {
        let txt = `🔑 **${secrets.length} Exposed Secret(s) Found in Active Code:**\n\n`;
        secrets.forEach((s, idx) => {
          txt += `${idx + 1}. **${s.type}** at Line ${s.line} (\`${s.matchPreview || '***'}\`)\n   *Fix:* Replace with environment variable (e.g. \`process.env.DB_PASSWORD\` or \`os.environ.get('DB_PASSWORD')\`).\n\n`;
        });
        return { answer: txt };
      }
      return { answer: "🔒 **No Leaked Secrets or Plaintext Credentials Detected.**\n\nTo ensure your application remains secure, always inject keys through `.env` files or secret vaults like AWS Secrets Manager or HashiCorp Vault. Never commit keys to Git repositories." };
    }

    // 5. SQL Injection & Database Inquiries
    if (qLower.includes('sql') || qLower.includes('injection') || qLower.includes('sqli') || qLower.includes('database')) {
      return {
        answer: `🛡️ **SQL Injection (CWE-89 • OWASP A03) Guide:**\n\nSQL Injection happens when untrusted user input is directly concatenated or interpolated into database queries without sanitization.\n\n### ❌ Vulnerable Insecure Pattern (Template String / Concat):\n\`\`\`javascript\nconst query = \`SELECT * FROM users WHERE username = '\${username}'\`;\ndb.query(query, (err, results) => { ... });\n\`\`\`\n\n### ✅ Remediated Secure Pattern (Parameterized Prepared Statement):\n\`\`\`javascript\nconst query = "SELECT * FROM users WHERE username = ?";\ndb.query(query, [username], (err, results) => { ... });\n\`\`\`\n\n**Key Rule:** Never concatenate raw inputs into query strings. Always use parameterized placeholders (\`?\` or \`%s\`) or an ORM (like Prisma / SQLAlchemy).`,
      };
    }

    // 6. Cross-Site Scripting (XSS)
    if (qLower.includes('xss') || qLower.includes('cross-site') || qLower.includes('html')) {
      return {
        answer: `🛡️ **Cross-Site Scripting (XSS • CWE-79) Guide:**\n\nXSS allows attackers to execute arbitrary scripts in victim browsers, leading to cookie theft and session hijacking.\n\n### ✅ Prevention Steps:\n* Sanitize HTML using **DOMPurify** before rendering.\n* Avoid \`dangerouslySetInnerHTML\` or raw \`innerHTML\`.\n* Set \`Content-Security-Policy\` (CSP) headers on your web server.`,
      };
    }

    // 7. General Audit for Active Code & Scan Findings
    return {
      answer: `🛡️ **Workspace Security Overview:**\n\n* **Active Code:** ${code ? `Auditing ${code.split('\n').length} lines of code.` : 'No code currently pasted in Code Scan.'}\n* **Active Vulnerabilities:** **${findingsCount} finding(s) detected**.\n\n${findingsCount > 0 ? `### 🔍 Immediate Action Required:\nFound **${activeFindings[0]?.type}** at Line ${activeFindings[0]?.line || 1}. Ask me *"how to fix this"* to see the exact patch snippet!` : 'Your active code currently has zero detected flaws. Feel free to paste any snippet into **Code Scan** and ask me to audit it!'}`,
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
          content: '⚠️ Copilot encountered an issue generating a response. Please try again.',
          timestamp: 'Error',
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
                  Active
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                {findingsCount > 0 ? `${findingsCount} scan findings in context` : 'Codebase Context Connected'}
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

        {/* Quick Suggestion Pills */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            background: 'var(--panel)',
          }}
        >
          {DRAWER_SUGGESTIONS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(s.query)}
                style={{
                  whiteSpace: 'nowrap',
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon size={12} style={{ color: '#3ba7f0' }} />
                <span>{s.label}</span>
              </button>
            );
          })}
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
                <span>Copilot is analyzing code...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Drawer Bottom Input */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--panel-2)',
          }}
        >
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
              placeholder="Ask Copilot how to patch or explain vulnerabilities..."
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
            Powered by Groq LLaMA & SecureCode AST Engine
          </div>
        </div>
      </div>
    </>
  );
}
