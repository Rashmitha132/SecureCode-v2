import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Zap, KeyRound, Brain, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Check, Bug, Lock, Server, Cpu,
  RefreshCw, Terminal, ChevronDown, ExternalLink, Activity, Code2,
  Sun, Moon, Menu, X
} from 'lucide-react';

const SAMPLES = {
  sqli: {
    lang: 'Python',
    title: '1. Python SQL Injection (CWE-89)',
    code: `import sqlite3\n\ndef authenticate_user(username, password):\n    conn = sqlite3.connect('users.db')\n    cursor = conn.cursor()\n    # ⚠️ SQL Injection via string formatting:\n    query = f"SELECT * FROM users WHERE u='{username}' AND p='{password}'"\n    cursor.execute(query)\n    return cursor.fetchone()`,
    name: 'SQL String Concatenation Flaw',
    cwe: 'CWE-89 • OWASP A03',
    risk: 94,
    isDanger: true,
    explanation: 'Raw parameter interpolation into SQL command allows arbitrary syntax execution and authentication bypass.',
    layers: {
      regex: 'MATCH (SQL-001)',
      entropy: '3.12 Bits (Low)',
      llm: 'CRITICAL EXPLOIT',
      gnn: '98.7% Defect Conf.'
    },
    diffDel: `- query = f"SELECT * FROM users WHERE u='{username}' AND p='{password}'"`,
    diffAdd: `+ query = "SELECT * FROM users WHERE u = ? AND p = ?"\n+ cursor.execute(query, (username, password))`
  },
  jwt: {
    lang: 'JavaScript',
    title: '2. Exposed AWS Secret & High Entropy Key',
    code: `// AWS Credentials & JWT Secret exposed\nconst AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";\nconst JWT_PRIVATE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTn6GnWVVOISMS3P54hSt3YQx2ZfQ";\n\nexport function getSigner() {\n  return { key: AWS_SECRET_KEY, token: JWT_PRIVATE };\n}`,
    name: 'Hardcoded High-Entropy Secrets',
    cwe: 'CWE-798 • OWASP A07',
    risk: 99,
    isDanger: true,
    explanation: 'Plaintext secret keys with Shannon entropy > 4.6 detected in repository source code.',
    layers: {
      regex: 'MATCH (AWS-KEY-02)',
      entropy: '4.88 Bits (CRITICAL)',
      llm: 'HIGH SEVERITY LEAK',
      gnn: '99.2% Defect Conf.'
    },
    diffDel: `- const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";`,
    diffAdd: `+ const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || "";\n+ if (!AWS_SECRET_KEY) throw new Error("Missing AWS_SECRET_KEY");`
  },
  xss: {
    lang: 'JavaScript',
    title: '3. React Unescaped HTML Injection (CWE-79)',
    code: `import React from 'react';\n\nexport function UserComment({ commentHtml }) {\n  // ⚠️ Stored XSS vulnerability:\n  return (\n    <div className="comment-card">\n      <div dangerouslySetInnerHTML={{ __html: commentHtml }} />\n    </div>\n  );\n}`,
    name: 'Unsanitized HTML Rendering (XSS)',
    cwe: 'CWE-79 • OWASP A03',
    risk: 86,
    isDanger: true,
    explanation: 'dangerouslySetInnerHTML injects unfiltered markup into DOM leading to cookie theft and session hijacking.',
    layers: {
      regex: 'MATCH (REACT-XSS)',
      entropy: '3.42 Bits (Normal)',
      llm: 'STORED XSS CONFIRMED',
      gnn: '95.3% Defect Conf.'
    },
    diffDel: `- <div dangerouslySetInnerHTML={{ __html: commentHtml }} />`,
    diffAdd: `+ import DOMPurify from 'dompurify';\n+ <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(commentHtml) }} />`
  },
  clean: {
    lang: 'Python',
    title: '4. Hardened Cryptographic Hash (Clean Code)',
    code: `import hashlib\nimport secrets\n\ndef secure_hash_password(password: str, salt: bytes = None) -> tuple:\n    if salt is None:\n        salt = secrets.token_bytes(32)\n    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 600000)\n    return key, salt`,
    name: 'Cryptographically Secure PBKDF2-HMAC',
    cwe: 'Compliant (Zero Findings)',
    risk: 0,
    isDanger: false,
    explanation: 'Code utilizes 600,000 rounds of PBKDF2 with cryptographically secure CSPRNG salt.',
    layers: {
      regex: 'CLEAN (0 Rules Triggered)',
      entropy: '3.18 Bits (Normal)',
      llm: 'SAFE IMPLEMENTATION',
      gnn: '1.2% Defect Conf. (PASS)'
    },
    diffDel: `# No vulnerabilities identified.`,
    diffAdd: `# Code meets enterprise security guidelines.`
  }
};

export default function LandingPageView({ goToNav, theme, setTheme }) {
  const [sampleKey, setSampleKey] = useState('sqli');
  const [patchApplied, setPatchApplied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const canvasRef = useRef(null);

  const currentSample = SAMPLES[sampleKey] || SAMPLES.sqli;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const nodes = [];
    const numNodes = Math.min(Math.floor(width / 35), 32);

    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(59, 167, 240, 0.55)' : 'rgba(217, 79, 192, 0.55)'
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(59, 167, 240, ${0.12 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleApplyPatch = () => {
    setPatchApplied(true);
    setTimeout(() => {
      setSampleKey('clean');
      setPatchApplied(false);
    }, 500);
  };

  const handleRunSim = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
    }, 350);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: '60px'
    }}>
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.45
        }}
      />

      {/* FULL STANDALONE MARKETING NAVBAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100%',
        height: '70px',
        background: 'var(--panel)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand Logo */}
          <div
            onClick={() => scrollToSection('hero-top')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(59, 167, 240, 0.2), rgba(124, 110, 232, 0.2))',
              border: '1px solid rgba(59, 167, 240, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3ba7f0'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              SecureCode <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 50%, #d94fc0 100%)',
                color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
              }}>v2.4</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button onClick={() => scrollToSection('hybrid-engine')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>4-Tier Detection</button>
            <button onClick={() => scrollToSection('playground-section')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>Interactive Scanner</button>
            <button onClick={() => scrollToSection('self-learning-section')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>Self-Learning</button>
            <button onClick={() => scrollToSection('features-section')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>DevSecOps Suite</button>
            <button onClick={() => scrollToSection('faq-section')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>FAQ</button>
          </nav>

          {/* Nav Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                width: '38px', height: '38px', borderRadius: '8px',
                background: 'var(--panel-2)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Toggle Light / Dark Theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Launch App Button */}
            <button
              onClick={() => goToNav('Code Scan')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 100%)',
                color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.88rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 167, 240, 0.35)'
              }}
            >
              <Zap size={15} />
              <span>Launch Live App</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="show-on-mobile"
              style={{
                width: '38px', height: '38px', borderRadius: '8px',
                background: 'var(--panel-2)', border: '1px solid var(--border)',
                color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-DOWN DRAWER */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: '70px', left: 0, width: '100%',
          background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          padding: '20px', zIndex: 99, display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <button onClick={() => scrollToSection('hybrid-engine')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>4-Tier Detection</button>
          <button onClick={() => scrollToSection('playground-section')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>Interactive Scanner</button>
          <button onClick={() => scrollToSection('self-learning-section')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>Self-Learning Loop</button>
          <button onClick={() => scrollToSection('features-section')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>DevSecOps Suite</button>
          <button onClick={() => scrollToSection('faq-section')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>FAQ</button>
          <button
            onClick={() => goToNav('Code Scan')}
            style={{
              padding: '12px', background: 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 100%)',
              color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            ⚡ Launch Live App
          </button>
        </div>
      )}

      {/* HERO SECTION */}
      <div id="hero-top" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '50px 20px 40px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '9999px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(59, 167, 240, 0.12)',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #3ba7f0, #7c6ee8)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            textTransform: 'uppercase'
          }}>Production AI</span>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            Hybrid AST Graph Neural Networks + LLM Guardrails
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.1rem, 5.5vw, 3.6rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-1.5px',
          marginBottom: '18px'
        }}>
          Autonomous AI Code Generation, <br />
          <span style={{
            background: 'linear-gradient(90deg, #3ba7f0 0%, #7c6ee8 50%, #d94fc0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Deep AST Vulnerability Detection
          </span> <br />
          & 1-Click Auto-Repair
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.2vw, 1.18rem)',
          opacity: 0.85,
          maxWidth: '780px',
          margin: '0 auto 30px',
          lineHeight: 1.6
        }}>
          SecureCode v2 blends <strong>Regex Heuristics</strong>, <strong>Shannon Entropy</strong>, <strong>Groq LLaMA-3.3</strong>, and a <strong>PyTorch AST Graph Neural Network</strong> into a closed-loop system that continuously self-improves from verified fixes.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <button
            onClick={() => goToNav('Code Scan')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 26px',
              background: 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(59, 167, 240, 0.4)'
            }}
          >
            <Zap size={18} />
            <span>Launch Live Code Scanner</span>
          </button>

          <button
            onClick={() => goToNav('Generate Code')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 26px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              color: 'inherit',
              borderRadius: '9px',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={18} />
            <span>AI Code Generator</span>
          </button>
        </div>

        {/* Key stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          maxWidth: '860px',
          margin: '0 auto 50px'
        }}>
          {[
            { val: '4-Tier', label: 'Hybrid Detection' },
            { val: '99.4%', label: 'Devign AST Accuracy' },
            { val: '< 140ms', label: 'AST-GCN Latency' },
            { val: '1-Click', label: 'Deterministic Patch' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3ba7f0', fontFamily: 'monospace' }}>{stat.val}</div>
              <div style={{ fontSize: '11.5px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 4-Tier Hybrid Detection Engines */}
        <div id="hybrid-engine" style={{ textAlign: 'left', marginBottom: '60px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3ba7f0', textTransform: 'uppercase', letterSpacing: '1px' }}>Multi-Layered Defense</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', fontWeight: 800, marginTop: '6px' }}>4-Tier Hybrid Vulnerability Detection</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '18px'
          }}>
            {[
              {
                icon: Terminal, color: '#3ba7f0', tier: 'Tier 1 • Heuristic', name: 'Regex Pattern Rules',
                desc: 'Sub-millisecond static rule matcher covering OWASP Top 10, dangerous eval(), SQL concatenation, and unescaped HTML.'
              },
              {
                icon: KeyRound, color: '#7c6ee8', tier: 'Tier 2 • Information Theory', name: 'Shannon Entropy Secrets',
                desc: 'Calculates byte randomness distributions to catch high-entropy exposed AWS keys, JWTs, and passwords with zero false alarms.'
              },
              {
                icon: Brain, color: '#d94fc0', tier: 'Tier 3 • Semantic AI', name: 'Groq LLaMA Semantic LLM',
                desc: 'High-speed 70B reasoning for complex business logic flaws, authorization bypasses, and multi-line race conditions.'
              },
              {
                icon: Cpu, color: '#10b981', tier: 'Tier 4 • Deep Learning', name: 'PyTorch AST GNN Detector',
                desc: 'Converts code into Abstract Syntax Trees (AST), processing node & control-flow edge tensors via 3-layer GCN classifiers.'
              }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '8px',
                    background: `${card.color}22`, color: card.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px'
                  }}>
                    <Icon size={22} />
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>{card.tier}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '6px 0 10px' }}>{card.name}</h3>
                  <p style={{ fontSize: '13.5px', opacity: 0.8, lineHeight: 1.55 }}>{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Live Playground */}
        <div id="playground-section" style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          textAlign: 'left',
          marginBottom: '60px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          {/* Playground Header */}
          <div style={{
            background: 'var(--panel-2)',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Vulnerability Scenario:</span>
              <select
                value={sampleKey}
                onChange={(e) => setSampleKey(e.target.value)}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  color: 'inherit',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="sqli">1. Python SQL Injection (CWE-89)</option>
                <option value="jwt">2. Exposed AWS Secret & High Entropy Key</option>
                <option value="xss">3. React Unescaped HTML Injection (CWE-79)</option>
                <option value="clean">4. Hardened PBKDF2-HMAC (Clean Code)</option>
              </select>
            </div>

            <button
              onClick={handleRunSim}
              style={{
                padding: '6px 14px',
                background: 'rgba(59, 167, 240, 0.15)',
                border: '1px solid rgba(59, 167, 240, 0.4)',
                color: '#3ba7f0',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={13} className={simulating ? 'spin-icon' : ''} />
              {simulating ? 'Analyzing...' : 'Re-Run 4-Tier Audit'}
            </button>
          </div>

          {/* Playground Body */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            minHeight: '380px'
          }}>
            {/* Left: Code Pane */}
            <div style={{ padding: '18px', background: '#090b10', color: '#f1f3f7', borderRight: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>Sample Source Code:</span>
                <span style={{ fontSize: '11px', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#3ba7f0' }}>{currentSample.lang}</span>
              </div>
              <pre style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#d1d5db',
                margin: 0,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto'
              }}>
                {currentSample.code}
              </pre>
            </div>

            {/* Right: Security Diagnostic & Auto Repair */}
            <div style={{ padding: '18px', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' }}>Security Index</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: currentSample.isDanger ? '#ef4444' : '#10b981' }}>
                    {currentSample.isDanger ? 'Vulnerability Found' : 'Verified Secure (Clean)'}
                  </div>
                </div>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontFamily: 'monospace', fontSize: '16px',
                  border: `3px solid ${currentSample.isDanger ? '#ef4444' : '#10b981'}`,
                  color: currentSample.isDanger ? '#ef4444' : '#10b981',
                  background: currentSample.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                }}>
                  {currentSample.risk}
                </div>
              </div>

              {/* Finding Box */}
              <div style={{
                background: 'var(--panel-2)',
                border: `1px solid ${currentSample.isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{currentSample.name}</span>
                  <span style={{
                    fontSize: '11px', fontFamily: 'monospace',
                    padding: '2px 6px', borderRadius: '4px',
                    background: currentSample.isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: currentSample.isDanger ? '#ef4444' : '#10b981'
                  }}>{currentSample.cwe}</span>
                </div>
                <p style={{ fontSize: '12.5px', opacity: 0.8, margin: '0 0 10px' }}>{currentSample.explanation}</p>

                {/* 4 layers mini table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11.5px' }}>
                  <div style={{ background: 'var(--panel)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ opacity: 0.6 }}>Regex: </span>
                    <span style={{ color: currentSample.isDanger ? '#ef4444' : '#10b981', fontWeight: 600 }}>{currentSample.layers.regex}</span>
                  </div>
                  <div style={{ background: 'var(--panel)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ opacity: 0.6 }}>Entropy: </span>
                    <span style={{ color: currentSample.layers.entropy.includes('CRITICAL') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{currentSample.layers.entropy}</span>
                  </div>
                  <div style={{ background: 'var(--panel)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ opacity: 0.6 }}>Groq LLM: </span>
                    <span style={{ color: currentSample.isDanger ? '#ef4444' : '#10b981', fontWeight: 600 }}>{currentSample.layers.llm}</span>
                  </div>
                  <div style={{ background: 'var(--panel)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ opacity: 0.6 }}>AST-GCN: </span>
                    <span style={{ color: currentSample.isDanger ? '#ef4444' : '#10b981', fontWeight: 600 }}>{currentSample.layers.gnn}</span>
                  </div>
                </div>
              </div>

              {/* Proposed Patch Diff */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, opacity: 0.8, marginBottom: '6px', textTransform: 'uppercase' }}>
                  1-Click Auto-Repair Patch:
                </div>
                <div style={{
                  background: '#090b10',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  lineHeight: 1.6,
                  overflowX: 'auto'
                }}>
                  <div style={{ color: '#ef4444' }}>{currentSample.diffDel}</div>
                  <div style={{ color: '#10b981' }}>{currentSample.diffAdd}</div>
                </div>
              </div>

              <button
                disabled={!currentSample.isDanger}
                onClick={handleApplyPatch}
                style={{
                  marginTop: 'auto',
                  padding: '10px 16px',
                  background: currentSample.isDanger ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--panel-2)',
                  color: currentSample.isDanger ? '#fff' : 'inherit',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: currentSample.isDanger ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} />
                <span>{currentSample.isDanger ? (patchApplied ? '✓ Patch Applied!' : 'Accept & Apply Security Patch') : 'Code is Clean'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Closed Loop Self Learning Workflow */}
        <div id="self-learning-section" style={{ textAlign: 'left', marginBottom: '60px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#7c6ee8', textTransform: 'uppercase', letterSpacing: '1px' }}>Continuous Improvement</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', fontWeight: 800, marginTop: '6px' }}>Closed-Loop Self-Learning Engine</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {[
              { step: '01', title: 'Code Generation', desc: 'Developer generates code via natural language prompts with Few-Shot memory.' },
              { step: '02', title: '4-Tier Audit', desc: 'Parallel scan across Regex, Entropy, LLM, and AST-GCN graphs under 200ms.' },
              { step: '03', title: 'Auto-Repair', desc: 'Line-by-line diff proposal created and verified before presentation.' },
              { step: '04', title: 'Feedback Store', desc: 'Verified non-vulnerable patches logged to MySQL database registry.' },
              { step: '05', title: 'Model Retrain', desc: 'Automated trigger fine-tunes GNN weights and updates few-shot generator memory.' },
            ].map((step, sIdx) => (
              <div key={sIdx} style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'var(--panel-2)', border: '1px solid rgba(59, 167, 240, 0.4)',
                  color: '#3ba7f0', fontWeight: 700, fontSize: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                  fontFamily: 'monospace'
                }}>
                  {step.step}
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{step.title}</h4>
                <p style={{ fontSize: '12.5px', opacity: 0.8, lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DevSecOps Suite */}
        <div id="features-section" style={{ textAlign: 'left', marginBottom: '60px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3ba7f0', textTransform: 'uppercase', letterSpacing: '1px' }}>Tooling Ecosystem</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', fontWeight: 800, marginTop: '6px' }}>Built for Modern DevSecOps Teams</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px'
          }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>AI Security Copilot</h3>
              <p style={{ fontSize: '0.88rem', opacity: 0.8, lineHeight: 1.55 }}>Contextual conversational assistant that explains root causes, answers CVE queries, and drafts custom mitigation rules.</p>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Dependency CVE Scanner</h3>
              <p style={{ fontSize: '0.88rem', opacity: 0.8, lineHeight: 1.55 }}>Integration with OSV.dev and national vulnerability databases to flag known vulnerabilities across package managers.</p>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>IaC & Config Auditor</h3>
              <p style={{ fontSize: '0.88rem', opacity: 0.8, lineHeight: 1.55 }}>Inspects Dockerfiles, Kubernetes manifests, and cloud configuration scripts for permissive ports and secrets.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq-section" style={{ textAlign: 'left', marginBottom: '60px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3ba7f0', textTransform: 'uppercase', letterSpacing: '1px' }}>Got Questions?</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', fontWeight: 800, marginTop: '6px' }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { q: 'How does the Graph Neural Network (GNN) analyze code ASTs?', a: 'SecureCode v2 parses incoming code into an Abstract Syntax Tree (AST), extracting node features and control/data-flow edge adjacencies. A 3-layer GCN embeds these relationships into PyTorch tensors for defect classification.' },
              { q: 'Does my proprietary code leave my local environment?', a: 'No. The Regex detector, Shannon Entropy engine, PyTorch GNN ML microservice, and MySQL feedback database execute 100% locally. The optional semantic analyzer uses your private Groq API key.' },
              { q: 'Which programming languages are currently supported?', a: 'SecureCode v2 provides full 4-tier hybrid scanning and code generation for Python, JavaScript, TypeScript, Go, Rust, Java, C++, PHP, and Ruby.' }
            ].map((faq, fIdx) => (
              <div key={fIdx} style={{
                background: 'var(--panel)', border: `1px solid ${activeFaq === fIdx ? '#3ba7f0' : 'var(--border)'}`,
                borderRadius: '8px', overflow: 'hidden'
              }}>
                <div
                  onClick={() => setActiveFaq(activeFaq === fIdx ? -1 : fIdx)}
                  style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === fIdx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: activeFaq === fIdx ? '#3ba7f0' : 'var(--text-dim)' }} />
                </div>
                {activeFaq === fIdx && (
                  <div style={{ padding: '0 20px 18px', opacity: 0.8, fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '44px 20px',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(59, 167, 240, 0.15)'
        }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, marginBottom: '12px' }}>
            Ready to Build Self-Healing, Secure Code?
          </h2>
          <p style={{ fontSize: '1rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto 28px' }}>
            Start scanning your repositories in seconds with 4-tier hybrid detection, AST Graph Neural Networks, and instant 1-click auto-repair.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => goToNav('Code Scan')}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #3ba7f0 0%, #7c6ee8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              ⚡ Launch Code Scan
            </button>
            <button
              onClick={() => goToNav('Dashboard')}
              style={{
                padding: '12px 24px',
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                color: 'inherit',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              Open Security Dashboard
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
