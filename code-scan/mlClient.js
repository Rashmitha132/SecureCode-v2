// mlClient.js
// Phase 2 of SecureCode v2: Client interface to the Python GNN ML Service.
//
// Communicates with the FastAPI microservice running on port 5001.
// Design principle: Graceful degradation — if the ML service is unreachable
// or times out, it logs a warning and returns an empty list so the core scanner
// never breaks or hangs.

require("dotenv").config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
const TIMEOUT_MS = 5000; // 5-second timeout for ML inference

/**
 * Maps a GNN-predicted bug category to severity and user-facing remediation.
 */
const GNN_CATEGORY_MAP = {
  injection: {
    name: "AST Anomaly: Injection Vulnerability",
    category: "Injection Vulnerabilities",
    severity: "High",
    fix: "Ensure all external arguments and dynamic query parameters are properly sanitized and bound via parameterized interfaces."
  },
  auth_bypass: {
    name: "AST Anomaly: Authorization / Access Bypass",
    category: "Improper Access Control",
    severity: "Critical",
    fix: "Verify user session and role-based permissions before executing protected state modifications."
  },
  unvalidated_input: {
    name: "AST Anomaly: Unvalidated Input",
    category: "Logic Errors",
    severity: "Medium",
    fix: "Add validation boundaries and sanitize all external inputs prior to processing."
  },
  null_reference: {
    name: "AST Anomaly: Null / Undefined Dereference Risk",
    category: "Logic Errors",
    severity: "Medium",
    fix: "Guard against null or undefined values using optional chaining or explicit existence checks."
  },
  resource_leak: {
    name: "AST Anomaly: Unclosed Resource / Stream Leak",
    category: "Insecure Configuration",
    severity: "Low",
    fix: "Wrap file descriptors, sockets, and stream handlers in try-finally blocks or context managers."
  },
  logic_error: {
    name: "AST Anomaly: Flow Graph Boundary Error",
    category: "Logic Errors",
    severity: "Medium",
    fix: "Review loop conditions and boundary comparison operators."
  }
};

/**
 * Calls the Python GNN ML service to detect bugs and vulnerabilities in code.
 *
 * @param {string} code       - source code to inspect
 * @param {string} [language] - "python" | "javascript" | etc.
 * @returns {Promise<Array>}  - Array of findings in the standard scanner format
 */
async function detectWithGNN(code, language = "python") {
  if (!code || !code.trim()) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[GNN ML Client] Server returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.is_buggy || data.bug_type === "clean") {
      return [];
    }

    const meta = GNN_CATEGORY_MAP[data.bug_type] || {
      name: `AST Structural Flaw: ${data.bug_type}`,
      category: "Logic Errors",
      severity: "Medium",
      fix: "Review abstract syntax tree control flow and data dependencies."
    };

    return [
      {
        type: meta.name,
        category: meta.category,
        severity: meta.severity,
        line: null,
        explanation: data.explanation || "Graph neural network identified high probability of structural code defect.",
        fix: meta.fix,
        confidence: typeof data.confidence === "number" ? data.confidence : 0.82,
        method: "gnn",
        matchPreview: `AST Graph (${data.node_count} nodes, ${data.edge_count} edges) • GNN v${data.model_version || 1}`,
        details: {
          nodeCount: data.node_count,
          edgeCount: data.edge_count,
          modelVersion: data.model_version,
          rawCategory: data.bug_type
        }
      }
    ];
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn(`[GNN ML Client] Inference timed out after ${TIMEOUT_MS}ms`);
    } else {
      // Service offline or connection refused -> silent fallback
      // console.warn("[GNN ML Client] Could not reach ML service:", err.message);
    }
    return [];
  }
}

/**
 * Checks ML service health and active model metadata.
 */
async function getMLStatus() {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/status`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
}

/**
 * Triggers background retraining on the ML service.
 */
async function triggerMLRetraining(samples = 400, epochs = 20) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples, epochs }),
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { detectWithGNN, getMLStatus, triggerMLRetraining };
