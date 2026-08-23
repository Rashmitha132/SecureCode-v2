// SecurityCopilotView.jsx
// Interactive Security Copilot & Knowledge Explorer

import React, { useState, useRef, useEffect } from 'react';
import {
  Brain, Send, Sparkles, BookOpen, ShieldCheck, Code2, Copy, Check,
  ExternalLink, Bot, User, RefreshCw, AlertTriangle, Layers, KeyRound,
  Lock, Terminal, ChevronRight, Bookmark
} from 'lucide-react';

const API_URL = 'http://localhost:4000';

const PROMPT_SUGGESTIONS = [
  {
    icon: ShieldCheck,
    title: 'Audit My Scan Findings',
    query: 'Analyze the security vulnerabilities from my current project scan and tell me what to fix first.',
  },
  {
    icon: Code2,
    title: 'Review My Scanned Code',
    query: 'Inspect my active scanned code and identify any insecure logic or parameter flaws.',
  },
  {
    icon: KeyRound,
    title: 'Check for Secrets in My Project',
    query: 'Did the scanner find any hardcoded API keys, tokens, or plaintext credentials in my project?',
  },
  {
    icon: Lock,
    title: 'How to Patch My Vulnerabilities',
    query: 'Show me the secure code fix for the most critical finding in my scanned project.',
  },
];

// Helper function to render inline markdown: `code`, **bold**, *italic*
function renderInline(text) {
  if (!text) return null;
  // Match `code` or **bold**
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
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11.5px',
            color: 'var(--text)',
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
    return <span key={idx} style={{ color: 'var(--text)' }}>{part}</span>;
  });
}

// Clean markdown parser rendering headings, tables, dividers, code blocks, and lists
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split code blocks first
  const rawParts = content.split(/(```[\s\S]*?```)/g);
  const elements = [];

  rawParts.forEach((part, pIdx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
      const codeSnippet = lang ? lines.slice(1).join('\n') : lines.join('\n');

      elements.push(
        <div
          key={`code-${pIdx}`}
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--text)',
            overflowX: 'auto',
            margin: '6px 0',
          }}
        >
          {lang && (
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '4px', fontWeight: 600 }}>
              {lang}
            </div>
          )}
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{codeSnippet}</pre>
        </div>
      );
      return;
    }

    // Process non-code block text line by line
    const lines = part.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Table Detection: consecutive lines starting and ending with '|'
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          // Parse header cells
          const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map(c => c.trim());

          // Skip divider rows like |---|---|
          const rowLines = tableLines.slice(1).filter(l => !l.match(/^\|[\s\-:|]+\|$/));

          elements.push(
            <div
              key={`tbl-${pIdx}-${i}`}
              style={{
                overflowX: 'auto',
                margin: '8px 0',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(99, 102, 241, 0.09)', borderBottom: '1.5px solid var(--border)' }}>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)', fontSize: '11px', textTransform: 'uppercase' }}>
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowLines.map((r, rIdx) => {
                    const cells = r.split('|').slice(1, -1).map(c => c.trim());
                    return (
                      <tr key={rIdx} style={{ borderBottom: rIdx === rowLines.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        {cells.map((c, cIdx) => (
                          <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text)', verticalAlign: 'top' }}>
                            {renderInline(c)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 2. Headings: #, ##, ###, ####
      if (trimmed.startsWith('#')) {
        const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          const fontSize = level === 1 ? '16px' : level === 2 ? '14.5px' : '13px';

          elements.push(
            <div
              key={`h-${pIdx}-${i}`}
              style={{
                fontSize,
                fontWeight: 700,
                color: '#818cf8',
                marginTop: '10px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{renderInline(text)}</span>
            </div>
          );
          i++;
          continue;
        }
      }

      // 3. Horizontal Rule: --- or *** or ___
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        elements.push(
          <div
            key={`hr-${pIdx}-${i}`}
            style={{
              height: '1px',
              background: 'var(--border)',
              margin: '8px 0',
            }}
          />
        );
        i++;
        continue;
      }

      // 4. Numbered List: 1. 2.
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div
            key={`num-${pIdx}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginLeft: '4px',
              margin: '3px 0',
            }}
          >
            <span
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontWeight: 700,
                fontSize: '10.5px',
                padding: '1px 6px',
                borderRadius: '10px',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              {numMatch[1]}
            </span>
            <div style={{ flex: 1, lineHeight: 1.5, color: 'var(--text)' }}>
              {renderInline(numMatch[2])}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 5. Bullet List: - or * or •
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[\*\-•]\s+/, '');
        elements.push(
          <div
            key={`bullet-${pIdx}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginLeft: '6px',
              margin: '3px 0',
            }}
          >
            <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '14px', lineHeight: 1 }}>•</span>
            <div style={{ flex: 1, lineHeight: 1.5, color: 'var(--text)' }}>
              {renderInline(bulletText)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // 6. Regular Paragraph Line
      elements.push(
        <div key={`p-${pIdx}-${i}`} style={{ lineHeight: 1.55, color: 'var(--text)', margin: '2px 0' }}>
          {renderInline(trimmed)}
        </div>
      );
      i++;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {elements}
    </div>
  );
}

export default function SecurityCopilotView({ results, code, goToNav }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'knowledge'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hello! I am your **Project Security Auditor**.\n\nI am fine-tuned exclusively to audit your **scanned code**, explain the **findings in your project**, and provide secure patches tailored to your code. What would you like me to inspect in your project?",
      citations: [
        { id: 'OWASP-A03', title: 'OWASP Top 10:2021', owasp: 'A03:2021-Injection', severity: 'Info' },
        { id: 'CWE-KB', title: 'CWE Security Knowledge Base', owasp: 'Industry Standard', severity: 'Info' },
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [knowledgeList, setKnowledgeList] = useState([]);
  const [templateList, setTemplateList] = useState([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Load Security Knowledge base list
    fetch(`${API_URL}/api/rag/knowledge`)
      .then(res => res.json())
      .then(data => {
        setKnowledgeList(data.knowledgeBase || []);
        setTemplateList(data.templates || []);
      })
      .catch(err => console.error('Failed to load security knowledge:', err));
  }, []);

  async function handleSend(customQuery) {
    const textToSend = customQuery || query;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/rag/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend.trim(),
          codeContext: code || '',
          scanFindings: results?.findings || [],
          chatHistory,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const data = await responseJsonClean(res);
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Security Copilot Error:', err);
      setError(err.message || 'Failed to reach Security Copilot.');
    } finally {
      setLoading(false);
    }
  }

  async function responseJsonClean(res) {
    const data = await res.json();
    return data;
  }

  function handleCopySnippet(text, idx) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 2000);
    });
  }

  const filteredKnowledge = knowledgeList.filter(k => {
    if (!knowledgeSearch) return true;
    const term = knowledgeSearch.toLowerCase();
    return (
      k.id.toLowerCase().includes(term) ||
      k.title.toLowerCase().includes(term) ||
      k.category.toLowerCase().includes(term) ||
      k.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="v2-results-wrapper" style={{ gap: '16px' }}>
      {/* ── Top Header ── */}
      <header className="v2-results-header">
        <div className="v2-results-header-title">
          <div className="v2-results-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }}>
            <Bot size={13} className="v2-tag-icon" />
            <span>AI Security Assistant</span>
          </div>
          <h1>Security Copilot</h1>
          <p className="hide-on-mobile">Interactive security expert grounded with OWASP Top 10, CWE standards, and your scan history.</p>
        </div>

        {/* Tab Switcher */}
        <div className="copilot-tabs-wrap">
          <button
            onClick={() => setActiveTab('chat')}
            className={`copilot-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <Bot size={14} /> Security Assistant
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`copilot-tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
          >
            <BookOpen size={14} /> Standards ({knowledgeList.length})
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: SECURITY CHAT ASSISTANT
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quick Prompt Suggestions */}
          {messages.length <= 2 && (
            <div className="copilot-prompts-grid">
              {PROMPT_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.query)}
                    className="copilot-prompt-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
                      <Icon size={16} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{item.title}</span>
                    </div>
                    <span className="copilot-prompt-desc">
                      {item.query.slice(0, 65)}...
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chat Transcript Area */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 20px',
              minHeight: '440px',
              maxHeight: '560px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '6px',
                  }}
                >
                  {/* Sender Header with Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-faint)' }}>
                    {isUser ? (
                      <>
                        <span>{m.timestamp}</span>
                        <span>•</span>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>You</span>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                          }}
                        >
                          <User size={13} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(168, 85, 247, 0.2)',
                            color: '#c084fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                          }}
                        >
                          <Bot size={13} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#c084fc' }}>SecureCode Copilot</span>
                        <span>•</span>
                        <span>{m.timestamp}</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: isUser ? 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)' : 'var(--panel-2)',
                      border: isUser ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                    }}
                  >
                    <FormattedMessage content={m.content} />
                  </div>

                  {/* Security Standards / Citations */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-faint)' }}>
                        📚 Security Standards:
                      </span>
                      {m.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          {c.id}: {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', fontSize: '13px', padding: '10px' }}>
                <RefreshCw size={16} className="v2-spin" />
                <span>Auditing security rules & synthesizing guidance...</span>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12.5px' }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '6px 8px 6px 16px',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything about security rules, CVEs, or how to fix vulnerabilities..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !query.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Ask Copilot</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: SECURITY STANDARDS & TEMPLATES EXPLORER
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'knowledge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              placeholder="Search CWE entries, attack vectors, or mitigation standards..."
              value={knowledgeSearch}
              onChange={e => setKnowledgeSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {/* Knowledge Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {filteredKnowledge.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8' }}>{item.id}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>{item.title}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: item.severity === 'Critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: item.severity === 'Critical' ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    {item.severity}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 600 }}>
                  {item.owasp}
                </div>

                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.45 }}>
                  {item.description}
                </p>

                <div style={{ marginTop: '6px', background: 'var(--panel-2)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: '#34d399' }}>
                  <strong style={{ color: '#ffffff' }}>Mitigation: </strong>
                  {item.mitigation}
                </div>

                <button
                  onClick={() => {
                    setActiveTab('chat');
                    handleSend(`Tell me more about ${item.id} (${item.title}) and how to test for it.`);
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 0 0',
                  }}
                >
                  Ask Copilot about {item.id} →
                </button>
              </div>
            ))}
          </div>

          {/* Secure Code Templates Section */}
          <div style={{ marginTop: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
              Verified Production Secure Templates (Few-Shot Generation Library)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {templateList.map((tpl, tIdx) => (
                <div
                  key={tpl.id || tIdx}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{tpl.title}</span>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-faint)', background: 'var(--panel-2)', padding: '2px 6px', borderRadius: '4px' }}>
                      {tpl.language}
                    </span>
                  </div>

                  <pre
                    style={{
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      maxHeight: '130px',
                      overflowY: 'auto',
                      color: 'var(--text-dim)',
                      margin: 0,
                    }}
                  >
                    {tpl.code}
                  </pre>

                  <button
                    onClick={() => handleCopySnippet(tpl.code, tIdx)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedCodeIdx === tIdx ? <><Check size={12} color="#10b981" /> Copied</> : <><Copy size={12} /> Copy Template</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
