// riskEngine.js
// Merges findings from all three sources — pattern/entropy (detectors.js),
// LLM semantic analysis (llmAnalyzer.js), and dependency scanning
// (depScanner.js) — into one deduped, prioritized list with a single risk
// score. This is what turns "a pile of warnings" into "here's what actually
// matters" — directly answering the problem statement's call to reduce
// false-positive fatigue and help teams prioritize.

const SEVERITY_WEIGHT = { Critical: 25, High: 10, Medium: 5, Low: 2 };
const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function normalizeSeverity(s) {
  return ["Critical", "High", "Medium", "Low"].includes(s) ? s : "Medium";
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.method}-${f.line ?? "x"}-${(f.matchPreview || f.type || "").slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeRiskScore(findings) {
  const raw = findings.reduce(
    (sum, f) => sum + (SEVERITY_WEIGHT[normalizeSeverity(f.severity)] || 0) * (f.confidence ?? 1),
    0
  );
  return Math.min(100, Math.round(raw));
}

function riskLevelFromScore(score) {
  if (score >= 70) return "Critical";
  if (score >= 40) return "High";
  if (score >= 15) return "Medium";
  if (score > 0) return "Low";
  return "None";
}

function buildRiskReport({ patternFindings = [], llmFindings = [], depFindings = [], gnnFindings = [] }) {
  const normalized = [
    ...patternFindings.map((f) => ({
      ...f,
      category: f.category || "Exposed Secrets",
      confidence: f.confidence ?? 1,
    })),
    ...llmFindings,
    ...depFindings,
    ...gnnFindings.map((f) => ({
      ...f,
      category: f.category || "Logic Errors",
      confidence: f.confidence ?? 0.82,
    })),
  ].map((f) => ({ ...f, severity: normalizeSeverity(f.severity) }));

  const deduped = dedupe(normalized);
  deduped.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.confidence ?? 1) - (a.confidence ?? 1)
  );

  const riskScore = computeRiskScore(deduped);

  const byCategory = {};
  for (const f of deduped) {
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }

  return {
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    totalFindings: deduped.length,
    critical: deduped.filter((f) => f.severity === "Critical").length,
    highSeverity: deduped.filter((f) => f.severity === "High").length,
    mediumSeverity: deduped.filter((f) => f.severity === "Medium").length,
    lowSeverity: deduped.filter((f) => f.severity === "Low").length,
    byCategory,
    findings: deduped,
  };
}

module.exports = { buildRiskReport };