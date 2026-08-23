import {
  Code2, ShieldCheck, Sparkles, ArrowRight, KeyRound,
  ShieldAlert, Package, Sliders, Wand2, Terminal, RefreshCw
} from 'lucide-react';

export default function HowItWorksView({ goToNav }) {
  const STEPS = [
    {
      step: '1',
      title: 'Generate or Add Code',
      icon: Wand2,
      color: '#6366f1',
      desc: 'Use AI to generate secure code from plain English, paste an existing snippet, or connect your GitHub repo.',
    },
    {
      step: '2',
      title: 'Instant Security Scan',
      icon: ShieldCheck,
      color: '#a855f7',
      desc: 'Smart AI scanners check your code in seconds for security flaws, leaked keys, and unsafe packages.',
    },
    {
      step: '3',
      title: 'One-Click AI Repair',
      icon: Sparkles,
      color: '#10b981',
      desc: 'Review easy-to-understand explanations and apply suggested code fixes automatically.',
    },
  ];

  const CORE_FEATURES = [
    {
      title: '✨ AI Code Generation (Code Studio)',
      desc: 'Describe what you need in plain English (e.g. "Create a secure JWT login in Python") and get production-ready code with built-in security protections.',
      icon: Wand2,
      color: '#818cf8',
      actionLabel: 'Try Generate Code →',
      nav: 'Generate Code',
    },
    {
      title: '🔍 Multi-Layer Security Scanning',
      desc: 'Scan code snippets, files, or entire repositories for exposed API tokens, SQL injection, XSS, and vulnerable npm/Python dependencies.',
      icon: Code2,
      color: '#a855f7',
      actionLabel: 'Go to Code Scan →',
      nav: 'Code Scan',
    },
  ];

  const DETECTIONS = [
    {
      title: 'Leaked Secrets & Keys',
      desc: 'Finds exposed API keys, passwords, and private tokens before they leak.',
      icon: KeyRound,
      color: '#f59e0b',
    },
    {
      title: 'Code Vulnerabilities',
      desc: 'Catches SQL injection, XSS, and security bugs in your code logic.',
      icon: ShieldAlert,
      color: '#ef4444',
    },
    {
      title: 'Unsafe Dependencies',
      desc: 'Flags outdated or vulnerable packages in your project manifest.',
      icon: Package,
      color: '#3b82f6',
    },
    {
      title: 'Insecure Settings',
      desc: 'Checks configuration files, environment setups, and permissions.',
      icon: Sliders,
      color: '#10b981',
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── 1. Clean Header ─────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>
          How It Works
        </h1>
        <p className="hide-on-mobile" style={{ margin: 0, fontSize: '14px', color: 'var(--text-dim)' }}>
          Generate secure code, scan existing files, and fix vulnerabilities in seconds.
        </p>
      </div>

      {/* ── 2. 3-Step Simple Roadmap ─────────────────────────────────────── */}
      <div className="how-steps-grid">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${s.color}22`,
                    color: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} />
                </div>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: s.color,
                    background: 'var(--panel-2)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                  }}
                >
                  STEP {s.step}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
                  {s.title}
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Two Core Pillars: Generate & Scan ─────────────────────────── */}
      <div className="how-pillars-grid">
        {CORE_FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${feat.color}1a`,
                    color: feat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                    {feat.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    {feat.desc}
                  </p>
                </div>
              </div>

              <button
                onClick={() => goToNav && goToNav(feat.nav)}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: feat.color,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                {feat.actionLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 4. What We Check (4 Simple Cards) ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          What SecureCode Checks For
        </h2>

        <div className="how-detections-grid">
          {DETECTIONS.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${d.color}1a`,
                    color: d.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    {d.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Action Banner with Generate & Scan ─────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
          border: '1px solid rgba(124, 110, 232, 0.3)',
          borderRadius: '14px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
            Ready to secure your code?
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            Generate new code with AI or scan your existing project right now.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => goToNav && goToNav('Generate Code')}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wand2 size={15} color="#a855f7" />
            <span>Generate Code</span>
          </button>

          <button
            onClick={() => goToNav && goToNav('Code Scan')}
            className="scan-btn"
            style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>Start Code Scan</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

