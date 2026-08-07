// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { scanCode } = require("./detectors");
const { analyzeWithLLM } = require("./llmAnalyzer");
const { scanDependencies } = require("./depScanner");
const { buildRiskReport } = require("./riskEngine");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 4000;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/scan", async (req, res) => {
  const { code, files, entropyEnabled = true, packageJson } = req.body;

  if (!code && !files) {
    return res.status(400).json({ error: "Provide either 'code' (string) or 'files' (array of {name, content})" });
  }

  try {
    // ---- 1. Pattern + entropy scan (existing, synchronous, instant) ----
    let patternFindings;
    let combinedCode; // sent to the LLM for semantic analysis
    let packageJsonContent = packageJson || null;

    if (code) {
      const result = scanCode(code, { entropyEnabled });
      patternFindings = result.findings;
      combinedCode = code;
    } else {
      const pkgFile = files.find((f) => f.name.endsWith("package.json"));
      if (pkgFile) packageJsonContent = pkgFile.content;

      const perFileResults = files.map((f) => ({ fileName: f.name, ...scanCode(f.content, { entropyEnabled }) }));
      patternFindings = perFileResults.flatMap((r) => r.findings.map((f) => ({ ...f, fileName: r.fileName })));

      // cap combined code sent to the LLM so requests stay fast and cheap
      combinedCode = files.map((f) => `// ${f.name}\n${f.content}`).join("\n\n").slice(0, 12000);
    }

    // ---- 2. Semantic (LLM) + dependency scans run in parallel ----
    const [llmFindings, depFindings] = await Promise.all([
      analyzeWithLLM(combinedCode),
      packageJsonContent ? scanDependencies(packageJsonContent) : Promise.resolve([]),
    ]);

    // ---- 3. Merge everything into one prioritized risk report ----
    const report = buildRiskReport({ patternFindings, llmFindings, depFindings });

    // ---- 4. Save to DB (best-effort — a save failure shouldn't break the response) ----
    try {
      await pool.query(
        `INSERT INTO scan_history
         (total_findings, high_severity, medium_severity, low_severity, findings_json, risk_score, risk_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          report.totalFindings,
          report.highSeverity,
          report.mediumSeverity,
          report.lowSeverity,
          JSON.stringify(report.findings),
          report.riskScore,
          report.riskLevel,
        ]
      );
    } catch (dbErr) {
      console.error("Failed to save scan to database:", dbErr.message);
    }

    return res.json({ source: code ? "single-input" : "multi-file", ...report });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Scan failed", details: err.message });
  }
});

app.get("/history", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, scanned_at, total_findings, high_severity, medium_severity, low_severity, findings_json, risk_score, risk_level
       FROM scan_history
       ORDER BY scanned_at DESC
       LIMIT 50`
    );

    const history = rows.map((row) => ({
      id: row.id,
      scannedAt: row.scanned_at,
      totalFindings: row.total_findings,
      highSeverity: row.high_severity,
      mediumSeverity: row.medium_severity,
      lowSeverity: row.low_severity,
      riskScore: row.risk_score,
      riskLevel: row.risk_level,
      findings: row.findings_json,
    }));

    return res.json({ history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not fetch history", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SecureCode backend running on http://localhost:${PORT}`);
});