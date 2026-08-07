// ResultsPanel.jsx
// Drop this into your frontend (e.g. src/components/ResultsPanel.jsx) and
// render it with the report object returned from POST /scan, e.g.:
//
//   const [report, setReport] = useState(null);
//   const res = await fetch("http://localhost:4000/scan", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ code }),
//   });
//   setReport(await res.json());
//   ...
//   <ResultsPanel report={report} />
//
// Uses inline styles only, so it drops into your existing dark theme
// without needing any extra CSS setup.

import { useState } from "react";

const SEVERITY_COLORS = {
  Critical: "#ff4d6d",
  High: "#ff8a3d",
  Medium: "#ffd23f",
  Low: "#4dd0e1",
};

const RISK_COLORS = {
  Critical: "#ff4d6d",
  High: "#ff8a3d",
  Medium: "#ffd23f",
  Low: "#4dd0e1",
  None: "#4caf50",
};

const METHOD_LABELS = {
  pattern: "Pattern match",
  entropy: "Entropy",
  llm: "AI analysis",
  dependency: "Dependency",
};

function SeverityBadge({ severity }) {
  const color = SEVERITY_COLORS[severity] || "#888";
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {severity}
    </span>
  );
}

function MethodBadge({ method }) {
  return (
    <span
      style={{
        background: "#ffffff10",
        color: "#aaa",
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {METHOD_LABELS[method] || method}
    </span>
  );
}

function ConfidenceBar({ confidence }) {
  if (confidence === undefined || confidence === null) return null;
  const pct = Math.round(confidence * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#ffffff15", borderRadius: 2, maxWidth: 120 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 2,
            background: pct > 70 ? "#ff8a3d" : "#4dd0e1",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#888" }}>{pct}% confidence</span>
    </div>
  );
}

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const hasDetail = finding.explanation || finding.fix;

  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid #ffffff12",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 8,
        cursor: hasDetail ? "pointer" : "default",
      }}
      onClick={() => hasDetail && setOpen((o) => !o)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <SeverityBadge severity={finding.severity} />
            <MethodBadge method={finding.method} />
            {finding.line && <span style={{ fontSize: 12, color: "#777" }}>Line {finding.line}</span>}
          </div>
          <div style={{ marginTop: 6, fontWeight: 600, color: "#eee" }}>{finding.type}</div>
          {finding.matchPreview && finding.method !== "llm" && (
            <div style={{ marginTop: 2, fontFamily: "monospace", fontSize: 12, color: "#888" }}>
              {finding.matchPreview}
            </div>
          )}
        </div>
        {hasDetail && <span style={{ color: "#666", fontSize: 12 }}>{open ? "▲" : "▼"}</span>}
      </div>

      {open && hasDetail && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #ffffff10" }}>
          {finding.explanation && (
            <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>
              <span style={{ color: "#888" }}>Why it matters: </span>
              {finding.explanation}
            </div>
          )}
          {finding.fix && (
            <div style={{ fontSize: 13, color: "#ccc" }}>
              <span style={{ color: "#888" }}>Suggested fix: </span>
              {finding.fix}
            </div>
          )}
          <ConfidenceBar confidence={finding.confidence} />
        </div>
      )}
    </div>
  );
}

function RiskGauge({ riskScore, riskLevel }) {
  const color = RISK_COLORS[riskLevel] || "#888";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: `4px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 18,
          color,
        }}
      >
        {riskScore}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#888" }}>Overall risk</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{riskLevel}</div>
      </div>
    </div>
  );
}

export default function ResultsPanel({ report }) {
  if (!report) return null;

  if (report.totalFindings === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <div style={{ color: "#eee", fontWeight: 600 }}>No issues found. Nice and clean.</div>
      </div>
    );
  }

  const categories = Object.entries(report.byCategory || {});

  return (
    <div>
      <RiskGauge riskScore={report.riskScore} riskLevel={report.riskLevel} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {categories.map(([cat, count]) => (
          <span
            key={cat}
            style={{
              background: "#ffffff10",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 12,
              color: "#ccc",
            }}
          >
            {cat} · {count}
          </span>
        ))}
      </div>

      <div>
        {report.findings.map((f, i) => (
          <FindingCard key={i} finding={f} />
        ))}
      </div>
    </div>
  );
}