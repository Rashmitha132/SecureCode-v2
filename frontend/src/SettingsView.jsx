import { useState, useEffect } from 'react';
import {
  Settings, Moon, Sun, Bell, User, Check, ChevronRight,
  Database, ShieldCheck, Trash2, BookOpen, Shield,
  Info, ExternalLink, X, AlertTriangle, Loader2, GitBranch,
  Lock, CheckCircle2, ChevronDown
} from 'lucide-react';

const API_URL = 'http://localhost:4000';

export default function SettingsView({ theme, setTheme, goToNav, onHistoryCleared }) {
  // Real Notification preferences saved in localStorage
  const [notifyScanComplete, setNotifyScanComplete] = useState(() => {
    return localStorage.getItem('sc_notify_scan') !== 'false';
  });
  const [notifyCritical, setNotifyCritical] = useState(() => {
    return localStorage.getItem('sc_notify_critical') !== 'false';
  });
  const [notifyGithub, setNotifyGithub] = useState(() => {
    return localStorage.getItem('sc_notify_github') !== 'false';
  });

  // Real Privacy & Data preferences
  const [storeScanHistory, setStoreScanHistory] = useState(() => {
    return localStorage.getItem('sc_store_history') !== 'false';
  });
  const [sendCodeToAI, setSendCodeToAI] = useState(() => {
    return localStorage.getItem('sc_ai_analysis') !== 'false';
  });

  // Connected Projects & GitHub account info
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${API_URL}/projects`);
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to load projects in settings:', err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadData();
  }, []);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function triggerSystemNotification(title, body) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (e) {
          console.warn('System notification error:', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            try {
              new Notification(title, { body });
            } catch (e) {}
          }
        });
      }
    }
  }

  // Toggles handlers with persistence + real notifications
  function toggleNotifyScan() {
    const val = !notifyScanComplete;
    setNotifyScanComplete(val);
    localStorage.setItem('sc_notify_scan', String(val));
    if (val) {
      showToast('Scan completion alerts enabled (Active)');
      triggerSystemNotification('🔔 SecureCode Alert', 'Scan completion notifications are now active!');
    } else {
      showToast('Scan completion alerts disabled');
    }
  }

  function toggleNotifyCritical() {
    const val = !notifyCritical;
    setNotifyCritical(val);
    localStorage.setItem('sc_notify_critical', String(val));
    if (val) {
      showToast('Critical vulnerability alerts enabled (Active)');
      triggerSystemNotification('🚨 Critical Flaw Alert', 'You will be alerted immediately when critical flaws are found!');
    } else {
      showToast('Critical vulnerability alerts disabled');
    }
  }

  function toggleNotifyGithub() {
    const val = !notifyGithub;
    setNotifyGithub(val);
    localStorage.setItem('sc_notify_github', String(val));
    if (val) {
      showToast('GitHub scan alerts enabled (Active)');
      triggerSystemNotification('🐙 GitHub Scan Alert', 'You will be alerted when repository scans complete!');
    } else {
      showToast('GitHub scan alerts disabled');
    }
  }

  function toggleStoreHistory() {
    const val = !storeScanHistory;
    setStoreScanHistory(val);
    localStorage.setItem('sc_store_history', String(val));
    showToast(val ? 'History recording enabled (Saving to DB)' : 'History recording disabled (Scans will not be stored)');
  }

  function toggleSendCodeAI() {
    const val = !sendCodeToAI;
    setSendCodeToAI(val);
    localStorage.setItem('sc_ai_analysis', String(val));
    showToast(val ? 'AI analysis enabled (Using LLM & GNN)' : 'AI analysis disabled (Local regex only)');
  }

  async function handleDeleteAllHistory() {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/history`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete history');
      setDeleteModalOpen(false);
      showToast('All scan history permanently deleted from database.');
      if (onHistoryCleared) onHistoryCleared();
    } catch (err) {
      alert('Error clearing history: ' + err.message);
    } finally {
      setDeleting(false);
    }
  }

  const githubAccount = projects.length > 0 ? (projects[0].platform === 'GitHub' ? projects[0].name : 'securecode-bot') : 'securecode-bot';
  const isConnected = projects.length > 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1e1b4b',
            border: '1px solid #6366f1',
            color: '#e0e7ff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#4fd08a" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Toolbar — Clean without the 3 redundant buttons */}
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
          Settings
        </h1>
        <p className="hide-on-mobile" style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)' }}>
          Manage your preferences and integrations
        </p>
      </div>

      {/* 2x2 Grid Section */}
      <div className="settings-grid">
        {/* ── CARD 1: Preferences ───────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(124, 110, 232, 0.18)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Preferences</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Customize your experience</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {/* Theme Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--panel-2)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Moon size={16} color="var(--text-dim)" />
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>Theme</span>
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    showToast(`Theme switched to ${e.target.value}`);
                  }}
                  style={{
                    background: '#0e111a',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    padding: '6px 28px 6px 12px',
                    cursor: 'pointer',
                    appearance: 'none',
                    outline: 'none',
                  }}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-dim)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: GitHub Integration ────────────────────────────────── */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.18)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitBranch size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>GitHub Integration</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect your GitHub account</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px',
              background: 'var(--panel-2)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              marginTop: 'auto',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isConnected ? '#10b981' : '#f59e0b',
                    boxShadow: isConnected ? '0 0 8px #10b981' : 'none',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: isConnected ? '#10b981' : '#f59e0b' }}>
                  {isConnected ? 'Connected' : 'Ready to Connect'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                {githubAccount}
              </div>
            </div>

            <button
              onClick={() => goToNav && goToNav('Projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #7c6ee8',
                background: 'rgba(124, 110, 232, 0.12)',
                color: '#c084fc',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Manage Repositories</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── CARD 3: Notifications ─────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Choose what you want to be notified about</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--text)' }}>Scan completed</span>
              <button
                className={`toggle ${notifyScanComplete ? 'on' : ''}`}
                onClick={toggleNotifyScan}
                aria-label="Toggle scan completed alert"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--text)' }}>Critical vulnerability found</span>
              <button
                className={`toggle ${notifyCritical ? 'on' : ''}`}
                onClick={toggleNotifyCritical}
                aria-label="Toggle critical alert"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--text)' }}>GitHub scan completed</span>
              <button
                className={`toggle ${notifyGithub ? 'on' : ''}`}
                onClick={toggleNotifyGithub}
                aria-label="Toggle github alert"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 4: Privacy & Data ────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.18)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Privacy & Data</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Manage your data and privacy settings</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Store scan history */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={16} color="var(--text-dim)" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>Store scan history</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>Keep your scan results and history</div>
                </div>
              </div>
              <button
                className={`toggle ${storeScanHistory ? 'on' : ''}`}
                onClick={toggleStoreHistory}
                aria-label="Toggle store history"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {/* Send code to AI provider */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={16} color="var(--text-dim)" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>Send code to AI provider</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>Allow AI analysis for better results</div>
                </div>
              </div>
              <button
                className={`toggle ${sendCodeToAI ? 'on' : ''}`}
                onClick={toggleSendCodeAI}
                aria-label="Toggle send code to AI"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {/* Delete all scan history button */}
            <div
              onClick={() => setDeleteModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={16} color="#ef4444" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>Delete all scan history</div>
                  <div style={{ fontSize: '11px', color: '#f87171' }}>Permanently delete all your scan data</div>
                </div>
              </div>
              <ChevronRight size={16} color="#ef4444" />
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CARD: About SecureCode ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '560px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(124, 110, 232, 0.18)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>About SecureCode</span>
              <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Version 1.0.0</span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              AI-powered code security platform that helps you find vulnerabilities and improve code quality.
            </p>
          </div>
        </div>

        {/* 2x2 Links Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
          <button
            onClick={() => setDocModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <BookOpen size={15} color="#818cf8" />
            <span>Documentation</span>
            <ExternalLink size={12} color="var(--text-faint)" />
          </button>

          <button
            onClick={() => setPrivacyModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Shield size={15} color="#818cf8" />
            <span>Privacy Policy</span>
            <ExternalLink size={12} color="var(--text-faint)" />
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            style={{
              color: 'var(--text-dim)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span>GitHub</span>
            <ExternalLink size={12} color="var(--text-faint)" />
          </a>

          <button
            onClick={() => setAboutModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <User size={15} color="#818cf8" />
            <span>About Us</span>
            <ExternalLink size={12} color="var(--text-faint)" />
          </button>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      {/* 1. Delete History Modal */}
      {deleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="panel-head">
              <div className="panel-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <Trash2 size={18} />
              </div>
              <div>
                <h2>Delete All Scan History?</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)' }}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <button className="icon-btn" onClick={() => setDeleteModalOpen(false)}><X size={16} /></button>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              All your previous code scan history, vulnerability reports, and risk scores in the database will be deleted permanently.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                className="text-btn"
                style={{ padding: '8px 14px', background: 'var(--panel-2)', borderRadius: '8px' }}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="scan-btn"
                style={{ background: '#ef4444', borderColor: '#ef4444', padding: '8px 16px' }}
                onClick={handleDeleteAllHistory}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Documentation Modal */}
      {docModalOpen && (
        <div className="modal-backdrop" onClick={() => setDocModalOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="panel-head">
              <div className="panel-icon"><BookOpen size={18} /></div>
              <div><h2>SecureCode Documentation</h2></div>
              <button className="icon-btn" onClick={() => setDocModalOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, margin: '14px 0' }}>
              <p>SecureCode provides comprehensive scanning capabilities:</p>
              <ul style={{ paddingLeft: '18px', margin: '8px 0' }}>
                <li><strong>Secrets & Entropy Detection:</strong> Detects API keys, JWTs, AWS credentials.</li>
                <li><strong>Dependency Vulnerability Scanning:</strong> Cross-checks with OSV.dev and CVE databases.</li>
                <li><strong>GNN AST Analysis & AI Modeling:</strong> Identifies logic and syntax security flaws.</li>
                <li><strong>Automated AI Repair:</strong> Generates immediate unified diff patches.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="scan-btn" onClick={() => setDocModalOpen(false)} style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Privacy Policy Modal */}
      {privacyModalOpen && (
        <div className="modal-backdrop" onClick={() => setPrivacyModalOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="panel-head">
              <div className="panel-icon"><Shield size={18} /></div>
              <div><h2>Privacy Policy</h2></div>
              <button className="icon-btn" onClick={() => setPrivacyModalOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, margin: '14px 0' }}>
              <p>Your privacy and source code security are strictly preserved:</p>
              <ul style={{ paddingLeft: '18px', margin: '8px 0' }}>
                <li>Personal Access Tokens (PAT) are stored with <strong>AES-256-GCM encryption</strong>.</li>
                <li>Your source code is never used to train public foundational models.</li>
                <li>All scan history and database records can be permanently deleted by you at any time.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="scan-btn" onClick={() => setPrivacyModalOpen(false)} style={{ padding: '6px 14px' }}>Understood</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. About Us Modal */}
      {aboutModalOpen && (
        <div className="modal-backdrop" onClick={() => setAboutModalOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="panel-head">
              <div className="panel-icon"><Info size={18} /></div>
              <div><h2>About SecureCode</h2></div>
              <button className="icon-btn" onClick={() => setAboutModalOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, margin: '14px 0' }}>
              <p>
                SecureCode is an advanced, autonomous AI security analysis system developed to bridge the gap between static analysis tools and AI-driven automated remediation.
              </p>
              <p style={{ margin: 0 }}>
                Version: <strong>2.0.0 (Production Engine)</strong>
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="scan-btn" onClick={() => setAboutModalOpen(false)} style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
