// detectors.js
// Two detection strategies:
// 1. Known-pattern matching — regex signatures for common API key/token formats
// 2. Entropy detection — catches secrets that don't match a known pattern
//    (custom keys, random passwords, etc.) by measuring randomness of strings

// ---------- 1. KNOWN PATTERNS ----------
const PATTERNS = [
  { name: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/g, severity: "High" },
  { name: "AWS Secret Access Key", regex: /(?<![A-Za-z0-9\/+=])[A-Za-z0-9\/+=]{40}(?![A-Za-z0-9\/+=])/g, severity: "High", requiresContext: /aws|secret/i },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/g, severity: "High" },
  { name: "Slack Token", regex: /xox[baprs]-[0-9A-Za-z-]{10,72}/g, severity: "High" },
  { name: "GitHub Personal Access Token", regex: /gh[pousr]_[A-Za-z0-9]{36,}/g, severity: "High" },
  { name: "OpenAI / Anthropic-style API Key", regex: /sk-[A-Za-z0-9]{20,}/g, severity: "High" },
  { name: "Generic Bearer Token", regex: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}=*/g, severity: "Medium" },
  { name: "Private Key Block", regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g, severity: "High" },
  { name: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}/g, severity: "Medium" },
  { name: "Hardcoded Database Password / Secret", regex: /(password|passwd|pwd|db_pass|secret_key)\s*[:=]\s*["']([^"'\r\n]{2,})["']/gi, severity: "High" },
];

function scanPatterns(code) {
  const findings = [];
  const lines = code.split("\n");

  // 1. Static Secret Patterns
  for (const p of PATTERNS) {
    const matches = [...code.matchAll(p.regex)];
    for (const m of matches) {
      const lineNumber = code.slice(0, m.index).split("\n").length;
      const originalLine = lines[lineNumber - 1] || m[0];
      const safeLine = originalLine.replace(m[0], 'password: process.env.DB_PASSWORD || process.env.SECRET_KEY');

      findings.push({
        type: p.name,
        severity: p.severity,
        line: lineNumber,
        matchPreview: maskSecret(m[0]),
        vulnerableCode: originalLine.trim(),
        correctedCode: safeLine.trim(),
        fix: `Extract hardcoded ${p.name} into environment variables (.env) or secret manager.`,
        method: "pattern",
      });
    }
  }

  // 2. OWASP Vulnerability Heuristics
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // SQL Injection in template strings or string concats
    if (/`\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\b[\s\S]*?\$\{/i.test(line) ||
        /(`|["'])\s*(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?WHERE[\s\S]*?\$\{/i.test(line)) {
      findings.push({
        type: "SQL Injection (SQLi) — Template Literal Interpolation",
        severity: "Critical",
        line: lineNo,
        matchPreview: "`SELECT ... ${...}`",
        vulnerableCode: line.trim(),
        correctedCode: 'const query = "SELECT * FROM users WHERE username = ?"; // Use parameterized placeholders',
        fix: "Use parameterized query placeholders (?) and pass arguments as an array: db.query(query, [username], ...)",
        method: "gnn",
      });
    } else if (/(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)[\s\S]*?["']\s*\+\s*[a-zA-Z0-9_\.]+/i.test(line) ||
               /[a-zA-Z0-9_\.]+\s*\+\s*["'][\s\S]*?(SELECT|INSERT|UPDATE|DELETE)/i.test(line)) {
      findings.push({
        type: "SQL Injection (SQLi) — Unsafe Concatenation",
        severity: "Critical",
        line: lineNo,
        matchPreview: '"SELECT..." + var',
        vulnerableCode: line.trim(),
        correctedCode: 'cursor.execute("SELECT * FROM users WHERE username = %s", (username,))',
        fix: "Use parameterized queries or prepared statements instead of direct string concatenation.",
        method: "gnn",
      });
    } else if (/f["']\s*(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?\{/i.test(line)) {
      findings.push({
        type: "SQL Injection (SQLi) — Python f-String Interpolation",
        severity: "Critical",
        line: lineNo,
        matchPreview: 'f"SELECT...{var}"',
        vulnerableCode: line.trim(),
        correctedCode: 'cursor.execute("SELECT * FROM users WHERE username = %s", (username,))',
        fix: "Pass parameters as a tuple argument to cursor.execute() instead of embedding in f-strings.",
        method: "gnn",
      });
    }

    // Dynamic Eval Execution
    if (/\beval\s*\(|new\s+Function\s*\(|\bexec\s*\(|setTimeout\s*\(\s*["']/i.test(line)) {
      findings.push({
        type: "Dynamic Code Execution (Insecure Eval)",
        severity: "Critical",
        line: lineNo,
        matchPreview: "eval(...)",
        vulnerableCode: line.trim(),
        correctedCode: "// Use safe parsing or dispatch maps instead of dynamic evaluation",
        fix: "Avoid dynamic execution of untrusted input strings.",
        method: "gnn",
      });
    }

    // XSS
    if (/dangerouslySetInnerHTML|innerHTML\s*=|document\.write\s*\(|res\.send\s*\(.*<[a-z]+/i.test(line)) {
      findings.push({
        type: "Cross-Site Scripting (XSS)",
        severity: "High",
        line: lineNo,
        matchPreview: "innerHTML / unescaped HTML",
        vulnerableCode: line.trim(),
        correctedCode: "DOMPurify.sanitize(userInput)",
        fix: "Sanitize untrusted markup before rendering to the DOM using DOMPurify.",
        method: "pattern",
      });
    }
  }

  return findings;
}

// ---------- 2. ENTROPY DETECTION ----------
function shannonEntropy(str) {
  const freq = {};
  for (const char of str) freq[char] = (freq[char] || 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function scanEntropy(code, { minLength = 20, entropyThreshold = 4.0 } = {}) {
  const findings = [];
  const lines = code.split("\n");
  const stringLiteralRegex = /["']([A-Za-z0-9+/=_\-!@#$%^&*]{20,})["']/g;
  const matches = [...code.matchAll(stringLiteralRegex)];

  for (const m of matches) {
    const candidate = m[1];
    if (candidate.length < minLength) continue;

    const entropy = shannonEntropy(candidate);
    if (entropy >= entropyThreshold) {
      const lineNumber = code.slice(0, m.index).split("\n").length;
      const originalLine = lines[lineNumber - 1] || candidate;
      const safeLine = originalLine.replace(candidate, 'os.environ.get("API_SECRET")');

      findings.push({
        type: "High-entropy string (possible secret)",
        severity: entropy >= 4.5 ? "Medium" : "Low",
        line: lineNumber,
        matchPreview: maskSecret(candidate),
        vulnerableCode: originalLine.trim(),
        correctedCode: safeLine.trim(),
        fix: "Remove high-entropy plaintext string and inject via environment variables.",
        entropy: entropy.toFixed(2),
        method: "entropy",
      });
    }
  }
  return findings;
}

// ---------- Helpers ----------

function maskSecret(secret) {
  if (secret.length <= 8) return "*".repeat(secret.length);
  return secret.slice(0, 4) + "*".repeat(Math.max(secret.length - 8, 4)) + secret.slice(-4);
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.line}-${f.matchPreview}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// entropyEnabled defaults to true so existing callers (like /history-less code) keep working unchanged
function scanCode(code, { entropyEnabled = true } = {}) {
  const patternFindings = scanPatterns(code);
  const entropyFindings = entropyEnabled ? scanEntropy(code) : [];
  const combined = dedupeFindings([...patternFindings, ...entropyFindings]);

  const severityRank = { High: 0, Medium: 1, Low: 2 };
  combined.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.line - b.line);

  return {
    totalFindings: combined.length,
    highSeverity: combined.filter((f) => f.severity === "High").length,
    mediumSeverity: combined.filter((f) => f.severity === "Medium").length,
    lowSeverity: combined.filter((f) => f.severity === "Low").length,
    findings: combined,
  };
}

module.exports = { scanCode, shannonEntropy, maskSecret };