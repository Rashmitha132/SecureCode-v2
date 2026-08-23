// RepairView.jsx
// Phase 3 — Side-by-Side Automatic Repair & Patch Comparison Component.
//
// Highlights line-by-line additions and deletions using the `diff` package,
// shows AI explanation of fixes, and provides an "Accept & Apply Repair" workflow.

import { useState } from 'react';
import {
  Wrench, CheckCircle2, XCircle, ArrowRight, Copy, Check,
  AlertTriangle, Split, AlignJustify, Cpu, Zap, ShieldCheck
} from 'lucide-react';
import { diffLines } from 'diff';

export default function RepairView({
  originalCode = '',
  repairedCode = '',
  explanation = '',
  changesCount = 0,
  onAccept,
  onCancel,
}) {
  const [diffMode, setDiffMode] = useState('split'); // 'split' | 'unified'
  const [copied, setCopied] = useState(false);

  // Compute line diff using npm 'diff' package
  const lineDiffs = diffLines(originalCode, repairedCode);

  function handleCopyRepaired() {
    navigator.clipboard.writeText(repairedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Pre-calculate line numbers for side-by-side view
  const leftLines = [];
  const rightLines = [];

  let leftNum = 1;
  let rightNum = 1;

  lineDiffs.forEach((part) => {
    const lines = part.value.replace(/\n$/, '').split('\n');
    lines.forEach((line) => {
      if (part.removed) {
        leftLines.push({ num: leftNum++, text: line, type: 'removed' });
        rightLines.push({ num: '', text: '', type: 'empty' });
      } else if (part.added) {
        leftLines.push({ num: '', text: '', type: 'empty' });
        rightLines.push({ num: rightNum++, text: line, type: 'added' });
      } else {
        leftLines.push({ num: leftNum++, text: line, type: 'normal' });
        rightLines.push({ num: rightNum++, text: line, type: 'normal' });
      }
    });
  });

  return (
    <div className="repair-view-container">
      {/* ── Top Header ── */}
      <div className="repair-header">
        <div className="repair-title-row">
          <div className="panel-icon" style={{ background: '#12301f', color: '#4fd08a' }}>
            <Wrench size={18} />
          </div>
          <div>
            <h2>AI Automatic Vulnerability Repair</h2>
            <p>Review the proposed security patch and compare changes before applying.</p>
          </div>
        </div>

        <div className="repair-header-actions">
          <div className="diff-mode-toggle">
            <button
              className={`diff-mode-btn ${diffMode === 'split' ? 'active' : ''}`}
              onClick={() => setDiffMode('split')}
              title="Side-by-side comparison"
            >
              <Split size={14} /> Side-by-Side
            </button>
            <button
              className={`diff-mode-btn ${diffMode === 'unified' ? 'active' : ''}`}
              onClick={() => setDiffMode('unified')}
              title="Unified diff list"
            >
              <AlignJustify size={14} /> Unified
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Explanation Card ── */}
      <div className="repair-explanation-card">
        <div className="repair-explanation-head">
          <div className="repair-badge">
            <ShieldCheck size={14} /> Security Patch Generated
          </div>
          <span className="repair-changes-badge">
            ~{changesCount} line(s) modified
          </span>
        </div>
        <p className="repair-explanation-text">{explanation}</p>
      </div>

      {/* ── Side-by-Side Split Diff View ── */}
      {diffMode === 'split' && (
        <div className="diff-split-grid">
          {/* Left: Original / Vulnerable */}
          <div className="diff-pane diff-pane-original">
            <div className="diff-pane-head">
              <span className="diff-pane-title">
                <XCircle size={14} style={{ color: '#e2504a' }} /> Original Code (Vulnerable)
              </span>
            </div>
            <div className="diff-code-scroll">
              <table className="diff-table">
                <tbody>
                  {leftLines.map((l, i) => (
                    <tr key={i} className={`diff-line diff-${l.type}`}>
                      <td className="diff-lineno">{l.num}</td>
                      <td className="diff-sign">{l.type === 'removed' ? '-' : ' '}</td>
                      <td className="diff-content">{l.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Repaired / Patched */}
          <div className="diff-pane diff-pane-repaired">
            <div className="diff-pane-head">
              <span className="diff-pane-title">
                <CheckCircle2 size={14} style={{ color: '#4fd08a' }} /> Repaired Code (Secure)
              </span>
              <button className="icon-btn" onClick={handleCopyRepaired} title="Copy repaired code">
                {copied ? <Check size={13} style={{ color: '#4fd08a' }} /> : <Copy size={13} />}
              </button>
            </div>
            <div className="diff-code-scroll">
              <table className="diff-table">
                <tbody>
                  {rightLines.map((l, i) => (
                    <tr key={i} className={`diff-line diff-${l.type}`}>
                      <td className="diff-lineno">{l.num}</td>
                      <td className="diff-sign">{l.type === 'added' ? '+' : ' '}</td>
                      <td className="diff-content">{l.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Diff View ── */}
      {diffMode === 'unified' && (
        <div className="diff-unified-pane">
          <div className="diff-pane-head">
            <span className="diff-pane-title">Unified Security Patch Diff</span>
            <button className="icon-btn" onClick={handleCopyRepaired} title="Copy repaired code">
              {copied ? <Check size={13} style={{ color: '#4fd08a' }} /> : <Copy size={13} />}
            </button>
          </div>
          <div className="diff-code-scroll">
            <table className="diff-table">
              <tbody>
                {lineDiffs.flatMap((part, idx) => {
                  const lines = part.value.replace(/\n$/, '').split('\n');
                  return lines.map((line, lineIdx) => {
                    const type = part.added ? 'added' : part.removed ? 'removed' : 'normal';
                    return (
                      <tr key={`${idx}-${lineIdx}`} className={`diff-line diff-${type}`}>
                        <td className="diff-sign">{part.added ? '+' : part.removed ? '-' : ' '}</td>
                        <td className="diff-content">{line}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Action Footer ── */}
      <div className="repair-footer">
        <button className="gen-regen-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="scan-btn" onClick={() => onAccept(repairedCode)}>
          <CheckCircle2 size={16} /> Accept &amp; Apply Security Patch <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
