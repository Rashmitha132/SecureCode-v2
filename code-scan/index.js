require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { scanCode } = require("./detectors");
const { analyzeWithLLM } = require("./llmAnalyzer");
const { scanDependencies } = require("./depScanner");
const { buildRiskReport } = require("./riskEngine");
const pool = require("./db");
const { encryptToken, decryptToken } = require("./tokenCrypto");
const { fetchRepoFiles } = require("./githubFetcher");
// ---- Phase 1: Code generation + learning service stubs ----
const { generateCode, SUPPORTED_LANGUAGES } = require("./codeGenerator");
const { recordFeedback, getStats } = require("./learningService");
// ---- Phase 2: Python GNN ML Service Client ----
const { detectWithGNN, getMLStatus, triggerMLRetraining } = require("./mlClient");
// ---- Phase 3: Automatic Vulnerability Repair ----
const { repairCode } = require("./repairModule");
// ---- Phase 4: RAG (Retrieval-Augmented Generation) & Security Copilot ----
const {
  SECURITY_KNOWLEDGE_BASE,
  SECURE_CODE_TEMPLATES,
  retrieveKnowledge,
  retrieveTemplates,
  askSecurityCopilot,
} = require("./ragEngine");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 4000;

// Converts a `projects` DB row (+ its PR rows) into the camelCase shape
// ProjectsPanel.jsx expects. Token columns are intentionally never
// included here — the encrypted token never leaves the backend.
function formatProject(row, prRows = []) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    repos: typeof row.repos_json === "string" ? JSON.parse(row.repos_json) : row.repos_json,
    securityScore: row.security_score,
    riskLevel: row.risk_level,
    totalIssues: row.total_issues,
    critical: row.critical_count,
    high: row.high_count,
    medium: row.medium_count,
    low: row.low_count,
    lastScan: row.last_scan,
    autoScanEnabled: Boolean(row.auto_scan_enabled),
    autoScanFrequency: row.auto_scan_frequency,
    createdAt: row.created_at,
    remediationProgress: row.remediation_progress,
    prs: prRows.map((pr) => ({
      id: pr.id,
      title: pr.title,
      status: pr.status,
      createdAt: pr.created_at,
    })),
  };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── Language Detector ────────────────────────────────────────────────────────
// Strict heuristic — returns true ONLY for valid programming languages & configs,
// and strictly rejects plain English prose, natural language text, and markdown.
function isProgrammingCode(text) {
  if (!text || !text.trim()) return false;
  const t = text.trim();

  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;

  // 1. Strong Code Construct Patterns (immediate match confirms valid code)
  const STRONG_CODE_PATTERNS = [
    /^\s*(import|from|export|require|include|using|package)\s+[\w@'"{]/m,
    /^\s*(def|function|func|fn|proc)\s+\w+\s*\(/m,
    /^\s*(public\s+class|class\s+\w+|struct\s+\w+|interface\s+\w+|enum\s+\w+)/m,
    /^\s*(const|let|var|val|int|float|double|bool|string)\s+\w+\s*[=;:\(]/m,
    /^\s*(if|else\s+if|elif|for|while|switch|try|catch)\s*[\(\{:]/m,
    /=>\s*[\{\(]|\bconsole\.log\(|\bprint\(|\bSystem\.out\.println\(|\bfmt\.Println\(/m,
    /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE)\s+/im,
    /^\s*\{[\s\S]*"[a-zA-Z0-9_-]+"\s*:\s*[\s\S]*\}/, // JSON object
    /^\s*[A-Z0-9_-]+\s*=\s*.+$/m, // .env / key-value config
    /^\s*(FROM|RUN|COPY|WORKDIR|CMD|ENTRYPOINT)\s+[a-zA-Z0-9_\/:-]+/m, // Dockerfile
  ];

  let strongMatches = 0;
  for (const pat of STRONG_CODE_PATTERNS) {
    if (pat.test(t)) strongMatches++;
  }
  if (strongMatches >= 1) return true;

  // 2. Natural language prose detection
  // Detects lines that consist of standard English words and conversational sentences
  const PROSE_SENTENCE_PAT = /^[0-9\.\-\*\•\s]*[A-Z][a-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}/;
  let proseLineCount = 0;

  for (const line of lines) {
    // If line has no code punctuation (like =, {, }, ;, <, >, =>, :) and starts with English words
    if (!/[={};<>]|=>|::|#include|\/\//.test(line) && PROSE_SENTENCE_PAT.test(line)) {
      proseLineCount++;
    }
  }

  // If 35% or more lines are conversational English sentences, reject as prose
  if (lines.length >= 2 && proseLineCount / lines.length >= 0.35) {
    return false;
  }

  // Single line prose check
  if (lines.length === 1 && PROSE_SENTENCE_PAT.test(lines[0]) && !/[={};<>()]/.test(lines[0])) {
    return false;
  }

  // 3. Syntax punctuation density check
  const codePunctuation = (t.match(/[;{}()[\]=+\-*/<>]/g) || []).length;
  const wordCount = (t.match(/[a-zA-Z]+/g) || []).length;

  if (wordCount > 10 && codePunctuation / (wordCount + 1) < 0.12) {
    return false; // too many words, almost no code syntax
  }

  return codePunctuation >= 2;
}

app.post("/scan", async (req, res) => {
  const { code, files, entropyEnabled = true, packageJson, language, storeHistory = true, allowAI = true } = req.body;

  if (!code && !files) {
    return res.status(400).json({ error: "Provide either 'code' (string) or 'files' (array of {name, content})" });
  }

  // Language gate — reject plain English before touching any scan engine
  if (code && !isProgrammingCode(code)) {
    return res.status(400).json({
      error: "not_code",
      message:
        "Please enter valid programming language code (Python, JavaScript, Java, C++, SQL, etc.). Plain text or English sentences cannot be scanned for security vulnerabilities.",
    });
  }

  try {
    // ---- 1. Pattern + entropy scan (synchronous, instant) ----
    let patternFindings;
    let combinedCode; // sent to LLM + GNN for semantic and graph analysis
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

      // cap combined code sent to the models so requests stay fast and cheap
      combinedCode = files.map((f) => `// ${f.name}\n${f.content}`).join("\n\n").slice(0, 12000);
    }

    // ---- 2. Semantic (LLM) + Dependency (OSV) + GNN (AST Graph) scans run in parallel ----
    const [llmFindings, depFindings, gnnFindings] = await Promise.all([
      allowAI ? analyzeWithLLM(combinedCode) : Promise.resolve([]),
      packageJsonContent ? scanDependencies(packageJsonContent) : Promise.resolve([]),
      detectWithGNN(combinedCode, language || "python"),
    ]);

    // ---- 3. Merge everything into one prioritized risk report ----
    const report = buildRiskReport({ patternFindings, llmFindings, depFindings, gnnFindings });

    // ---- 4. Save to DB only if storeHistory is enabled ----
    if (storeHistory !== false) {
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

// DELETE /history - Deletes all scan history entries from the database
app.delete("/history", async (req, res) => {
  try {
    await pool.query(`DELETE FROM scan_history`);
    await pool.query(`DELETE FROM project_scans`).catch(() => {});
    return res.json({ success: true, message: "All scan history deleted successfully." });
  } catch (err) {
    console.error("Failed to delete history:", err);
    return res.status(500).json({ error: "Could not delete history", details: err.message });
  }
});

// ---------------------------------------------------------------------
// RAG (Retrieval-Augmented Generation) & Security Copilot Endpoints
// ---------------------------------------------------------------------

// POST /api/rag/chat - Chat with Security Copilot using RAG
app.post("/api/rag/chat", async (req, res) => {
  const { query, codeContext, scanFindings, chatHistory } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required and must be non-empty" });
  }

  try {
    const result = await askSecurityCopilot({
      query: query.trim(),
      codeContext: typeof codeContext === "string" ? codeContext : "",
      scanFindings: Array.isArray(scanFindings) ? scanFindings : [],
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
    });

    return res.json(result);
  } catch (err) {
    console.error("RAG Copilot Chat Error:", err);
    return res.status(500).json({ error: "Failed to generate copilot response", details: err.message });
  }
});

// GET /api/rag/knowledge - Search or list security knowledge base entries
app.get("/api/rag/knowledge", (req, res) => {
  const { q, limit, category } = req.query;
  try {
    if (q) {
      const results = retrieveKnowledge(String(q), {
        limit: limit ? parseInt(limit, 10) : 5,
        category: category ? String(category) : undefined,
      });
      return res.json({ results, query: q });
    }
    return res.json({
      knowledgeBase: SECURITY_KNOWLEDGE_BASE,
      templates: SECURE_CODE_TEMPLATES,
      totalEntries: SECURITY_KNOWLEDGE_BASE.length,
      totalTemplates: SECURE_CODE_TEMPLATES.length,
    });
  } catch (err) {
    console.error("RAG Knowledge Query Error:", err);
    return res.status(500).json({ error: "Failed to retrieve knowledge", details: err.message });
  }
});

// ---------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------

app.get("/projects", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM projects ORDER BY created_at DESC`
    );

    const projects = await Promise.all(
      rows.map(async (row) => {
        const [prRows] = await pool.query(
          `SELECT id, title, status, created_at, merged_at
           FROM project_prs WHERE project_id = ? ORDER BY created_at DESC`,
          [row.id]
        );
        return formatProject(row, prRows);
      })
    );

    return res.json({ projects });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not fetch projects", details: err.message });
  }
});

app.post("/projects", async (req, res) => {
  const { name, platform, repos, settings = {}, token } = req.body;

  if (!name || !platform || !Array.isArray(repos) || repos.length === 0) {
    return res.status(400).json({ error: "Provide 'name', 'platform', and a non-empty 'repos' array" });
  }
  if (!["GitHub", "GitLab"].includes(platform)) {
    return res.status(400).json({ error: "'platform' must be 'GitHub' or 'GitLab'" });
  }

  try {
    let encryptedToken = null, tokenIv = null, tokenAuthTag = null;
    if (token) {
      const enc = encryptToken(token);
      encryptedToken = enc.encryptedToken;
      tokenIv = enc.iv;
      tokenAuthTag = enc.authTag;
    }

    const [result] = await pool.query(
      `INSERT INTO projects
       (name, platform, repos_json, auto_scan_enabled, auto_scan_frequency, encrypted_token, token_iv, token_auth_tag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        platform,
        JSON.stringify(repos),
        settings.autoScan !== undefined ? Boolean(settings.autoScan) : true,
        settings.scanFrequency || "daily",
        encryptedToken,
        tokenIv,
        tokenAuthTag,
      ]
    );

    const [rows] = await pool.query(`SELECT * FROM projects WHERE id = ?`, [result.insertId]);
    return res.status(201).json(formatProject(rows[0], []));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not create project", details: err.message });
  }
});

app.get("/projects/:projectId", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM projects WHERE id = ?`, [req.params.projectId]);
    if (rows.length === 0) return res.status(404).json({ error: "Project not found" });

    const [prRows] = await pool.query(
      `SELECT id, title, status, created_at, merged_at
       FROM project_prs WHERE project_id = ? ORDER BY created_at DESC`,
      [req.params.projectId]
    );

    return res.json(formatProject(rows[0], prRows));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not fetch project", details: err.message });
  }
});

app.patch("/projects/:projectId", async (req, res) => {
  const { autoScanEnabled, autoScanFrequency } = req.body;

  if (autoScanEnabled === undefined && autoScanFrequency === undefined) {
    return res.status(400).json({ error: "Provide 'autoScanEnabled' and/or 'autoScanFrequency' to update" });
  }
  if (autoScanFrequency && !["on-push", "daily", "weekly"].includes(autoScanFrequency)) {
    return res.status(400).json({ error: "'autoScanFrequency' must be one of: on-push, daily, weekly" });
  }

  try {
    const fields = [];
    const values = [];
    if (autoScanEnabled !== undefined) { fields.push("auto_scan_enabled = ?"); values.push(Boolean(autoScanEnabled)); }
    if (autoScanFrequency !== undefined) { fields.push("auto_scan_frequency = ?"); values.push(autoScanFrequency); }
    values.push(req.params.projectId);

    const [result] = await pool.query(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Project not found" });

    const [rows] = await pool.query(`SELECT * FROM projects WHERE id = ?`, [req.params.projectId]);
    const [prRows] = await pool.query(
      `SELECT id, title, status, created_at, merged_at
       FROM project_prs WHERE project_id = ? ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    return res.json(formatProject(rows[0], prRows));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not update project", details: err.message });
  }
});

// ---------------------------------------------------------------------
// Trigger a scan: fetches the repo's files via the GitHub API, runs them
// through the existing scanCode/analyzeWithLLM/scanDependencies pipeline,
// and persists the results. Responds immediately (202) and does the actual
// work in the background since fetching + LLM analysis can take a while;
// the frontend is expected to poll GET /projects/:id/scans for completion.
// ---------------------------------------------------------------------
app.post("/projects/:projectId/scan", async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const [projRows] = await pool.query(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (projRows.length === 0) return res.status(404).json({ error: "Project not found" });
    const project = projRows[0];

    const [scanResult] = await pool.query(
      `INSERT INTO project_scans (project_id, status) VALUES (?, 'in_progress')`,
      [projectId]
    );
    const scanId = scanResult.insertId;

    res.status(202).json({
      scanId,
      projectId: Number(projectId),
      status: "started",
      startedAt: new Date().toISOString(),
    });

    // ---- background work (runs after the response above is already sent) ----
    (async () => {
      try {
        if (!project.encrypted_token) {
          throw new Error("No stored access token for this project");
        }
        const token = decryptToken(project.encrypted_token, project.token_iv, project.token_auth_tag);
        const repos = typeof project.repos_json === "string" ? JSON.parse(project.repos_json) : project.repos_json;
        const { url, branch } = repos[0];

        const files = await fetchRepoFiles(url, branch || "main", token);
        if (files.length === 0) throw new Error("No scannable source files found in repo");

        const pkgFile = files.find((f) => f.name.endsWith("package.json"));
        const perFileResults = files.map((f) => ({ fileName: f.name, ...scanCode(f.content, { entropyEnabled: true }) }));
        const patternFindings = perFileResults.flatMap((r) => r.findings.map((f) => ({ ...f, fileName: r.fileName })));
        const combinedCode = files.map((f) => `// ${f.name}\n${f.content}`).join("\n\n").slice(0, 12000);

        const [llmFindings, depFindings, gnnFindings] = await Promise.all([
          analyzeWithLLM(combinedCode),
          pkgFile ? scanDependencies(pkgFile.content) : Promise.resolve([]),
          detectWithGNN(combinedCode, "python"),
        ]);

        const report = buildRiskReport({ patternFindings, llmFindings, depFindings, gnnFindings });

        // Count by severity — robust to however buildRiskReport labels findings.
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const f of report.findings || []) {
          const sev = (f.severity || "low").toLowerCase();
          if (counts[sev] !== undefined) counts[sev] += 1;
        }
        const totalIssues = counts.critical + counts.high + counts.medium + counts.low;
        // riskScore is "how bad" (higher = worse); securityScore is the inverse shown on the dashboard.
        const securityScore = Math.max(0, Math.min(100, Math.round(100 - (report.riskScore ?? 0))));

        await pool.query(
          `UPDATE project_scans SET status='completed', risk_score=?, risk_level=?, findings_json=?,
           critical_count=?, high_count=?, medium_count=?, low_count=?, total_findings=?
           WHERE id=?`,
          [report.riskScore, report.riskLevel, JSON.stringify(report.findings), counts.critical, counts.high, counts.medium, counts.low, totalIssues, scanId]
        );

        await pool.query(
          `UPDATE projects SET security_score=?, risk_level=?, total_issues=?,
           critical_count=?, high_count=?, medium_count=?, low_count=?, last_scan=NOW()
           WHERE id=?`,
          [securityScore, report.riskLevel, totalIssues, counts.critical, counts.high, counts.medium, counts.low, projectId]
        );
      } catch (bgErr) {
        console.error(`Scan ${scanId} failed:`, bgErr.message);
        await pool.query(`UPDATE project_scans SET status='failed' WHERE id=?`, [scanId]).catch(() => {});
      }
    })();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not start scan", details: err.message });
  }
});

app.get("/projects/:projectId/scans", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, scanned_at, status, risk_score, risk_level, findings_json,
              critical_count, high_count, medium_count, low_count, total_findings
       FROM project_scans
       WHERE project_id = ?
       ORDER BY scanned_at DESC
       LIMIT 50`,
      [req.params.projectId]
    );

    const scans = rows.map((row) => ({
      id: row.id,
      projectId: Number(req.params.projectId),
      scannedAt: row.scanned_at,
      status: row.status,
      riskScore: row.risk_score,
      riskLevel: row.risk_level,
      findings: typeof row.findings_json === "string" ? JSON.parse(row.findings_json) : (row.findings_json || []),
      critical: row.critical_count,
      high: row.high_count,
      medium: row.medium_count,
      low: row.low_count,
    }));

    return res.json({ scans });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not fetch project scan history", details: err.message });
  }
});

// DELETE /projects/:projectId - Deletes project and cleans up related scans & PRs
app.delete("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  try {
    await pool.query(`DELETE FROM project_prs WHERE project_id = ?`, [projectId]).catch(() => {});
    await pool.query(`DELETE FROM project_scans WHERE project_id = ?`, [projectId]).catch(() => {});
    const [result] = await pool.query(`DELETE FROM projects WHERE id = ?`, [projectId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ success: true, message: `Project ${projectId} deleted successfully` });
  } catch (err) {
    console.error("Failed to delete project:", err);
    return res.status(500).json({ error: "Could not delete project", details: err.message });
  }
});

// POST /projects/:projectId/prs - Records a new remediation PR
app.post("/projects/:projectId/prs", async (req, res) => {
  const { projectId } = req.params;
  const { title, status = "open" } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Provide a 'title' for the PR" });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO project_prs (project_id, title, status) VALUES (?, ?, ?)`,
      [projectId, title, status]
    );
    // Update remediation progress estimation on project
    await pool.query(
      `UPDATE projects SET remediation_progress = LEAST(100, remediation_progress + 25) WHERE id = ?`,
      [projectId]
    ).catch(() => {});

    return res.status(201).json({ id: result.insertId, projectId: Number(projectId), title, status, createdAt: new Date() });
  } catch (err) {
    console.error("Failed to create PR entry:", err);
    return res.status(500).json({ error: "Could not create PR entry", details: err.message });
  }
});

// GET /projects/:projectId/export - Generates standard SARIF 2.1.0 or full JSON
app.get("/projects/:projectId/export", async (req, res) => {
  const { projectId } = req.params;
  const { format = "sarif" } = req.query;

  try {
    const [projRows] = await pool.query(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (projRows.length === 0) return res.status(404).json({ error: "Project not found" });
    const project = projRows[0];

    const [scanRows] = await pool.query(
      `SELECT * FROM project_scans WHERE project_id = ? ORDER BY scanned_at DESC LIMIT 1`,
      [projectId]
    );
    const latestScan = scanRows[0] || {};
    let findings = [];
    if (typeof latestScan.findings_json === "string") {
      try { findings = JSON.parse(latestScan.findings_json); } catch { findings = []; }
    } else if (Array.isArray(latestScan.findings_json)) {
      findings = latestScan.findings_json;
    }

    if (format === "sarif") {
      const sarifReport = {
        $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        version: "2.1.0",
        runs: [
          {
            tool: {
              driver: {
                name: "SecureCode Scanner",
                informationUri: "https://securecode.dev",
                version: "2.0.0",
                rules: findings.map((f, idx) => ({
                  id: `SEC-${idx + 1}`,
                  name: f.type || "SecurityVulnerability",
                  shortDescription: { text: f.type || "Security issue" },
                  fullDescription: { text: f.explanation || "Vulnerability detected in source code" },
                  defaultConfiguration: {
                    level: (f.severity || "warning").toLowerCase() === "critical" || (f.severity || "").toLowerCase() === "high" ? "error" : "warning",
                  },
                })),
              },
            },
            results: findings.map((f, idx) => ({
              ruleId: `SEC-${idx + 1}`,
              level: (f.severity || "").toLowerCase() === "critical" || (f.severity || "").toLowerCase() === "high" ? "error" : "warning",
              message: { text: `${f.type}: ${f.explanation || "No description"}` },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: f.fileName || "unknown" },
                    region: { startLine: f.line || 1 },
                  },
                },
              ],
            })),
          },
        ],
      };
      res.setHeader("Content-Disposition", `attachment; filename="${project.name}-scan.sarif"`);
      res.setHeader("Content-Type", "application/json");
      return res.json(sarifReport);
    }

    return res.json({
      project: formatProject(project, []),
      latestScan,
      findings,
      exportedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Export failed:", err);
    return res.status(500).json({ error: "Export failed", details: err.message });
  }
});

// =====================================================================
// PHASE 1 — Code Generation & Learning Service Routes
// =====================================================================

// POST /api/generate
// Accepts a natural-language prompt and returns generated code.
// The generated code can be immediately sent to POST /scan.
app.post("/api/generate", async (req, res) => {
  const { prompt, language = "python" } = req.body;

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: "Provide a non-empty 'prompt' string." });
  }

  const normalizedLang = String(language).toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    return res.status(400).json({
      error: `Unsupported language: "${language}"`,
      supported: SUPPORTED_LANGUAGES,
    });
  }

  try {
    const result = await generateCode(prompt.trim(), normalizedLang);

    // Record generation attempt into self-learning example database
    const { recordExample } = require("./learningService");
    recordExample({
      prompt: prompt.trim(),
      generatedCode: result.code,
      language: normalizedLang,
      feedbackSource: "code_generation",
      modelVersion: 1,
    }).catch(() => {});

    return res.json(result);
  } catch (err) {
    console.error("Code generation failed:", err.message);
    return res.status(500).json({ error: "Code generation failed", details: err.message });
  }
});

// GET /api/generate/languages
// Returns the list of supported languages so the frontend stays in sync.
app.get("/api/generate/languages", (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

// POST /api/feedback
// Records a thumbs-up / thumbs-down signal on any scan or generation.
// Phase 4 will enrich this data; for Phase 1 it just persists the rating.
app.post("/api/feedback", async (req, res) => {
  const { scanId, rating, comment } = req.body;
  const numRating = Number(rating);

  if (![1, -1].includes(numRating)) {
    return res.status(400).json({ error: "'rating' must be 1 (positive) or -1 (negative)." });
  }

  try {
    await recordFeedback({ scanId, rating: numRating, comment: comment || null });
    return res.json({ success: true });
  } catch (err) {
    console.error("Feedback recording failed:", err.message);
    return res.status(500).json({ error: "Could not record feedback", details: err.message });
  }
});

// GET /api/dashboard
// Aggregates real metrics, recent activity (latest 4), severity distribution, and top 5 findings
app.get("/api/dashboard", async (_req, res) => {
  try {
    let totalScans = 0;
    let latestScan = null;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let latestFindings = [];
    let recentActivity = [];
    let learningInfo = { iteration: 1, accuracy: null, f1: null };

    // 1. Fetch total scans & latest scan from scan_history
    try {
      const [[scanCountRow]] = await pool.query(`SELECT COUNT(*) AS total FROM scan_history`);
      const [[projScanCountRow]] = await pool.query(`SELECT COUNT(*) AS total FROM project_scans`).catch(() => [[{ total: 0 }]]);
      totalScans = (scanCountRow?.total || 0) + (projScanCountRow?.total || 0);

      const [latestRows] = await pool.query(
        `SELECT id, scanned_at, total_findings, high_severity, medium_severity, low_severity, findings_json, risk_score, risk_level, source_type, repair_attempted
         FROM scan_history
         ORDER BY scanned_at DESC
         LIMIT 1`
      );

      if (latestRows.length > 0) {
        latestScan = latestRows[0];
        let parsedFindings = [];
        if (typeof latestScan.findings_json === "string") {
          try { parsedFindings = JSON.parse(latestScan.findings_json); } catch (e) { parsedFindings = []; }
        } else if (Array.isArray(latestScan.findings_json)) {
          parsedFindings = latestScan.findings_json;
        }

        // Count severities
        for (const f of parsedFindings) {
          const sev = (f.severity || "").toLowerCase();
          if (sev === "critical") criticalCount++;
          else if (sev === "high") highCount++;
          else if (sev === "medium") mediumCount++;
          else lowCount++;
        }

        if (parsedFindings.length === 0 && (latestScan.high_severity || latestScan.medium_severity || latestScan.low_severity)) {
          highCount = latestScan.high_severity || 0;
          mediumCount = latestScan.medium_severity || 0;
          lowCount = latestScan.low_severity || 0;
        }

        const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
        latestFindings = [...parsedFindings]
          .sort((a, b) => (severityRank[(a.severity || "").toLowerCase()] ?? 4) - (severityRank[(b.severity || "").toLowerCase()] ?? 4))
          .slice(0, 5)
          .map((f) => ({
            severity: f.severity || "Medium",
            type: f.type || f.category || "Security Finding",
            location: f.fileName ? (f.line ? `${f.fileName}:${f.line}` : f.fileName) : (f.line ? `Line ${f.line}` : "Source snippet"),
            explanation: f.explanation || "",
            fix: f.fix || "",
            time: latestScan.scanned_at,
          }));
      }
    } catch (dbErr) {
      console.warn("[Dashboard] DB scan fetch warning:", dbErr.message);
    }

    // 2. Fetch learning iteration info
    try {
      const [learningRows] = await pool.query(
        `SELECT iteration, gnn_accuracy, gnn_f1 FROM learning_iterations ORDER BY iteration DESC LIMIT 1`
      );
      if (learningRows && learningRows.length > 0) {
        learningInfo = {
          iteration: learningRows[0].iteration,
          accuracy: learningRows[0].gnn_accuracy != null ? Number((learningRows[0].gnn_accuracy * 100).toFixed(1)) : null,
          f1: learningRows[0].gnn_f1 != null ? Number((learningRows[0].gnn_f1 * 100).toFixed(1)) : null,
        };
      }
    } catch (learnErr) {
      try {
        const mlStatus = await getMLStatus();
        if (mlStatus && mlStatus.online) {
          learningInfo = {
            iteration: mlStatus.model_version || 1,
            accuracy: mlStatus.accuracy != null ? Number((mlStatus.accuracy * 100).toFixed(1)) : null,
            f1: mlStatus.f1_score != null ? Number((mlStatus.f1_score * 100).toFixed(1)) : null,
          };
        }
      } catch {}
    }

    // 3. Assemble Recent Activity (latest 4 real events only)
    try {
      const activities = [];

      const [recentScans] = await pool.query(
        `SELECT id, scanned_at, total_findings, risk_score, source_type, repair_attempted FROM scan_history ORDER BY scanned_at DESC LIMIT 4`
      ).catch(() => [[]]);
      for (const s of (recentScans || [])) {
        activities.push({
          id: `scan-${s.id}`,
          type: "scan",
          title: "Security Scan Completed",
          description: `${s.total_findings || 0} issue${s.total_findings === 1 ? '' : 's'} identified (Risk: ${s.risk_score || 0}/100)`,
          time: s.scanned_at,
        });

        if (s.repair_attempted) {
          activities.push({
            id: `repair-${s.id}`,
            type: "repair",
            title: "Automated Code Repair",
            description: "Generated remediation patch for vulnerabilities",
            time: s.scanned_at,
          });
        }
      }

      const [recentGens] = await pool.query(
        `SELECT id, language, created_at FROM learning_examples WHERE feedback_source = 'code_generation' ORDER BY created_at DESC LIMIT 4`
      ).catch(() => [[]]);
      for (const g of (recentGens || [])) {
        activities.push({
          id: `gen-${g.id}`,
          type: "generate",
          title: `AI Code Generated (${(g.language || 'python').toUpperCase()})`,
          description: "Synthesized production code with security guidelines",
          time: g.created_at,
        });
      }

      recentActivity = activities
        .filter((a) => a.time)
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 4);
    } catch (actErr) {
      console.warn("[Dashboard] Activity fetch warning:", actErr.message);
    }

    const totalFindings = criticalCount + highCount + mediumCount + lowCount;
    const securityScore = latestScan
      ? Math.max(0, Math.min(100, Math.round(100 - (latestScan.risk_score || 0))))
      : (totalScans > 0 ? 100 : null);

    return res.json({
      metrics: {
        securityScore,
        totalScans,
        criticalIssues: criticalCount,
        learning: learningInfo,
      },
      severityDistribution: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        total: totalFindings,
      },
      recentActivity,
      latestFindings,
    });
  } catch (err) {
    console.error("Dashboard overview failed:", err.message);
    return res.status(500).json({ error: "Could not fetch dashboard summary", details: err.message });
  }
});

// GET /api/learning/stats
// Returns aggregate learning progress for the dashboard.
// Returns stub/empty data until Phase 4 tables are created.
app.get("/api/learning/stats", async (_req, res) => {
  try {
    const stats = await getStats();
    return res.json(stats);
  } catch (err) {
    console.error("Learning stats failed:", err.message);
    return res.status(500).json({ error: "Could not fetch learning stats", details: err.message });
  }
});

// GET /api/ml/status
// Exposes GNN active model version, accuracy, F1 score, and health
app.get("/api/ml/status", async (_req, res) => {
  try {
    const status = await getMLStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch ML status", details: err.message });
  }
});

// POST /api/ml/train
// Triggers GNN model retraining
app.post("/api/ml/train", async (req, res) => {
  const { samples = 400, epochs = 20 } = req.body || {};
  try {
    const result = await triggerMLRetraining(samples, epochs);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Could not trigger ML retraining", details: err.message });
  }
});

// POST /api/learning/trigger
// Manually triggers the self-learning loop retraining cycle
app.post("/api/learning/trigger", async (req, res) => {
  try {
    const { checkAndTriggerRetraining } = require("./learningService");
    const result = await checkAndTriggerRetraining(0); // Force trigger with threshold 0
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: "Could not trigger learning loop", details: err.message });
  }
});

// POST /api/repair
// Generates an automatic patch/repair for vulnerable code
app.post("/api/repair", async (req, res) => {
  const { code, findings = [], language = "python", scanId } = req.body;

  if (!code || !String(code).trim()) {
    return res.status(400).json({ error: "Provide 'code' to repair." });
  }

  try {
    const result = await repairCode({ code, findings, language });

    // If scanId was provided, record that a repair was attempted
    if (scanId) {
      pool.query(
        `UPDATE scan_history SET repair_attempted = TRUE, repaired_code = ? WHERE id = ?`,
        [result.repairedCode, scanId]
      ).catch(() => {});
    }

    return res.json(result);
  } catch (err) {
    console.error("Code repair failed:", err.message);
    return res.status(500).json({ error: "Code repair failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SecureCode backend running on http://localhost:${PORT}`);
});