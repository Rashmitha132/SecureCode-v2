// ragEngine.js
// RAG (Retrieval-Augmented Generation) Engine for SecureCode
// Contains curated OWASP Top 10 / CWE security knowledge base, verified secure code templates,
// hybrid lexical/semantic retrieval, and Groq-grounded Security Copilot chat.

require("dotenv").config();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Security Knowledge Base (OWASP Top 10 & CWE Rulebooks)
// ─────────────────────────────────────────────────────────────────────────────
const SECURITY_KNOWLEDGE_BASE = [
  {
    id: "CWE-89",
    title: "SQL Injection (SQLi)",
    category: "Injection",
    owasp: "A03:2021-Injection",
    severity: "Critical",
    description: "Untrusted user input is directly concatenated or formatted into a database query string, allowing attackers to manipulate queries, bypass authentication, and access or delete sensitive data.",
    mitigation: "Always use parameterized queries, prepared statements, or ORM parameter binding (e.g. SQLAlchemy, Prisma, PyMySQL parameterized placeholders). Never use string interpolation (f-strings, %, +) for SQL.",
    codeExamples: {
      python: {
        bad: 'cursor.execute(f"SELECT * FROM users WHERE user = \'{username}\'")',
        good: 'cursor.execute("SELECT * FROM users WHERE user = %s", (username,))',
      },
      javascript: {
        bad: 'db.query(`SELECT * FROM users WHERE user = \'${username}\'`)',
        good: 'db.query("SELECT * FROM users WHERE user = ?", [username])',
      },
    },
    tags: ["sql", "sqli", "database", "injection", "query", "select", "insert", "cwe-89", "orm"],
  },
  {
    id: "CWE-79",
    title: "Cross-Site Scripting (XSS)",
    category: "Injection",
    owasp: "A03:2021-Injection",
    severity: "High",
    description: "User input is rendered into HTML, DOM, or JavaScript contexts without adequate escaping or sanitization, allowing attackers to execute malicious scripts in victims' browsers.",
    mitigation: "Contextually encode all user-controlled data before rendering. In React, avoid `dangerouslySetInnerHTML`. In Node/Express, use libraries like DOMPurify or helmet Content Security Policy (CSP).",
    codeExamples: {
      javascript: {
        bad: 'element.innerHTML = "<div>" + userInput + "</div>";',
        good: 'element.textContent = userInput; // Or DOMPurify.sanitize(userInput)',
      },
    },
    tags: ["xss", "cross-site scripting", "innerhtml", "dom", "script", "html", "cwe-79", "sanitize"],
  },
  {
    id: "CWE-798",
    title: "Use of Hard-coded Credentials / Secrets",
    category: "Secrets",
    owasp: "A07:2021-Identification and Authentication Failures",
    severity: "Critical",
    description: "API keys, database passwords, private keys, or tokens are hardcoded directly in source code, making them vulnerable to source repository leaks and decompilation.",
    mitigation: "Load credentials strictly from environment variables (process.env / os.environ) or secure secret managers (AWS Secrets Manager, HashiCorp Vault, Doppler). Add secrets to .gitignore.",
    codeExamples: {
      python: {
        bad: 'API_KEY = "sk-live-938491823918239128391283"',
        good: 'import os\nAPI_KEY = os.environ.get("STRIPE_API_KEY")',
      },
      javascript: {
        bad: 'const DB_PASS = "SuperSecretPassword123!";',
        good: 'const DB_PASS = process.env.DB_PASSWORD;',
      },
    },
    tags: ["secret", "api key", "token", "password", "hardcoded", "credential", "cwe-798", "jwt secret"],
  },
  {
    id: "CWE-352",
    title: "Cross-Site Request Forgery (CSRF)",
    category: "Broken Authentication",
    owasp: "A01:2021-Broken Access Control",
    severity: "Medium",
    description: "An attacker forces an authenticated user's browser to send unauthorized HTTP requests (e.g. transfer money, change email) by exploiting ambient browser credentials like session cookies.",
    mitigation: "Implement Anti-CSRF Synchronizer Tokens (Double Submit Cookie or csurf middleware), enforce SameSite=Lax/Strict on cookies, and require custom headers (e.g. X-Requested-With) on state-changing API endpoints.",
    codeExamples: {
      javascript: {
        bad: 'res.cookie("session", id, { httpOnly: true });',
        good: 'res.cookie("session", id, { httpOnly: true, secure: true, sameSite: "strict" });',
      },
    },
    tags: ["csrf", "cross-site request forgery", "cookie", "samesite", "token", "session", "cwe-352"],
  },
  {
    id: "CWE-22",
    title: "Improper Limitation of a Pathname (Path Traversal)",
    category: "Access Control",
    owasp: "A01:2021-Broken Access Control",
    severity: "High",
    description: "User input containing '../' or absolute file paths is passed into file system operations, allowing unauthorized reading or overwriting of arbitrary files on the server.",
    mitigation: "Validate that the canonicalized path starts with the allowed base directory using `path.resolve` or `os.path.abspath`, and use a whitelist of allowed file names.",
    codeExamples: {
      python: {
        bad: 'with open(f"/var/data/{user_path}", "r") as f:\n    data = f.read()',
        good: 'import os\nsafe_base = os.path.abspath("/var/data")\ntarget = os.path.abspath(os.path.join(safe_base, user_path))\nif not target.startswith(safe_base):\n    raise PermissionError("Access denied")\nwith open(target, "r") as f:\n    data = f.read()',
      },
    },
    tags: ["path traversal", "directory traversal", "file read", "dot dot slash", "cwe-22", "filepath"],
  },
  {
    id: "CWE-327",
    title: "Use of a Broken or Risky Cryptographic Algorithm",
    category: "Insecure Configuration",
    owasp: "A02:2021-Cryptographic Failures",
    severity: "High",
    description: "Using outdated or broken crypto algorithms like MD5, SHA-1, DES, or ECB mode ciphers that are vulnerable to collision attacks, rainbow tables, and cryptanalysis.",
    mitigation: "Use modern algorithms: SHA-256/SHA-512 or BLAKE3 for hashing; Argon2id or Bcrypt with cost >= 12 for passwords; AES-256-GCM or ChaCha20-Poly1305 for authenticated encryption.",
    codeExamples: {
      python: {
        bad: 'import hashlib\nhashed = hashlib.md5(password.encode()).hexdigest()',
        good: 'import bcrypt\nhashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))',
      },
    },
    tags: ["crypto", "cryptography", "md5", "sha1", "des", "ecb", "aes", "bcrypt", "cwe-327", "hash"],
  },
  {
    id: "CWE-94",
    title: "Improper Control of Generation of Code (Code Injection)",
    category: "Injection",
    owasp: "A03:2021-Injection",
    severity: "Critical",
    description: "Passing user-controlled strings into `eval()`, `exec()`, `Function()`, or `subprocess.Popen(..., shell=True)` allowing arbitrary Remote Code Execution (RCE).",
    mitigation: "Never use `eval()` or `exec()`. For parsing data, use structured formats like `json.loads()`. For subprocess execution, pass arguments as a list with `shell=False`.",
    codeExamples: {
      python: {
        bad: 'import subprocess\nsubprocess.Popen(f"ping {user_host}", shell=True)',
        good: 'import subprocess\nsubprocess.Popen(["ping", "-c", "1", user_host], shell=False)',
      },
    },
    tags: ["eval", "exec", "rce", "code injection", "command injection", "subprocess", "shell", "cwe-94"],
  },
  {
    id: "CWE-502",
    title: "Deserialization of Untrusted Data",
    category: "Logic Error",
    owasp: "A08:2021-Software and Data Integrity Failures",
    severity: "Critical",
    description: "Deserializing untrusted data with formats like Python `pickle`, Java `ObjectInputStream`, or PHP `unserialize` can trigger arbitrary code execution during object reconstitution.",
    mitigation: "Use safe serialization formats like JSON or Protocol Buffers. In Python, replace `pickle.loads` with `json.loads` or `yaml.safe_load`.",
    codeExamples: {
      python: {
        bad: 'import pickle\ndata = pickle.loads(raw_user_payload)',
        good: 'import json\ndata = json.loads(raw_user_payload)',
      },
    },
    tags: ["deserialization", "pickle", "unserialize", "object", "cwe-502", "yaml"],
  },
  {
    id: "CWE-287",
    title: "Improper Authentication / JWT Weak Validation",
    category: "Broken Authentication",
    owasp: "A07:2021-Identification and Authentication Failures",
    severity: "High",
    description: "JWT tokens validated with `verify=False`, weak hardcoded HMAC secret keys, or allowing the `none` algorithm, leading to complete authentication bypass.",
    mitigation: "Always explicitly specify allowed algorithms (e.g. `algorithms=['HS256']` or `['RS256']`), use strong >= 256-bit secrets, and enforce expiration (`exp`) and issuer (`iss`) checks.",
    codeExamples: {
      python: {
        bad: 'jwt.decode(token, options={"verify_signature": False})',
        good: 'jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp", "iss"]})',
      },
    },
    tags: ["jwt", "token", "authentication", "auth", "signature", "cwe-287", "session"],
  },
  {
    id: "CWE-918",
    title: "Server-Side Request Forgery (SSRF)",
    category: "Broken Access Control",
    owasp: "A10:2021-Server-Side Request Forgery (SSRF)",
    severity: "High",
    description: "The web application fetches a remote resource without validating the destination URL, allowing attackers to coerce the server to send requests to internal infrastructure (e.g. cloud metadata at 169.254.169.254, internal databases).",
    mitigation: "Validate and whitelist destination protocols (http/https only) and domains. Reject loopback (127.0.0.1, localhost) and private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254).",
    codeExamples: {
      python: {
        bad: 'import requests\nres = requests.get(user_provided_url)',
        good: 'import ipaddress, socket, urllib.parse, requests\n# Validate IP is global/public before fetching\nhostname = urllib.parse.urlparse(user_provided_url).hostname\nip = socket.gethostbyname(hostname)\nif not ipaddress.ip_address(ip).is_global:\n    raise ValueError("Private IP access blocked")\nres = requests.get(user_provided_url, timeout=5)',
      },
    },
    tags: ["ssrf", "server-side request forgery", "metadata", "internal ip", "cwe-918", "requests"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Verified Secure Code Templates (Few-Shot Generation Library)
// ─────────────────────────────────────────────────────────────────────────────
const SECURE_CODE_TEMPLATES = [
  {
    id: "tpl-jwt-auth-py",
    title: "Secure JWT Authentication Handler (Python / FastAPI)",
    language: "python",
    tags: ["jwt", "auth", "login", "fastapi", "token"],
    code: `from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import os

SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be configured with >= 256-bit entropy")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return {"username": username}
    except JWTError:
        raise credentials_exception`,
  },
  {
    id: "tpl-sql-pool-node",
    title: "Secure Parameterized MySQL Pool (Node.js)",
    language: "javascript",
    tags: ["sql", "mysql", "database", "node", "pool"],
    code: `const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function findUserById(userId) {
  // Secure parameterized query prevents SQL injection (CWE-89)
  const [rows] = await pool.execute(
    'SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

module.exports = { pool, findUserById };`,
  },
  {
    id: "tpl-pw-hash-py",
    title: "Secure Argon2 / Bcrypt Password Hashing (Python)",
    language: "python",
    tags: ["password", "hash", "argon2", "bcrypt", "security"],
    code: `import bcrypt

def hash_password(plain_password: str) -> str:
    """Hash password using Bcrypt with cost factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password in constant time to prevent timing attacks."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))`,
  },
  {
    id: "tpl-rate-limiter-node",
    title: "In-Memory Rate Limiter Middleware (Express / Node.js)",
    language: "javascript",
    tags: ["rate limit", "middleware", "express", "ddos", "bruteforce"],
    code: `const rateLimit = new Map();

function createRateLimiter({ windowMs = 60000, maxRequests = 100 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimit.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimit.set(ip, record);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfterMs: record.resetAt - now
      });
    }

    next();
  };
}

module.exports = { createRateLimiter };`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Hybrid Lexical + Keyword Scoring Retrieval
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Retrieves top-K security knowledge items matching the query.
 *
 * @param {string} query - search query (e.g. "sql injection in python", "CWE-89")
 * @param {object} options
 * @param {number} [options.limit=3]
 * @param {string} [options.category]
 * @returns {Array<object>}
 */
function retrieveKnowledge(query = "", { limit = 3, category } = {}) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    return SECURITY_KNOWLEDGE_BASE.slice(0, limit);
  }

  const scored = SECURITY_KNOWLEDGE_BASE.map(doc => {
    let score = 0;
    const docTokens = new Set([
      ...tokenize(doc.id),
      ...tokenize(doc.title),
      ...tokenize(doc.category),
      ...tokenize(doc.owasp),
      ...tokenize(doc.description),
      ...tokenize(doc.mitigation),
      ...(doc.tags || []),
    ]);

    for (const q of queryTokens) {
      // Exact ID or title match gets heavy boost
      if (doc.id.toLowerCase() === q || doc.id.toLowerCase().replace("-", "") === q) score += 20;
      if (doc.title.toLowerCase().includes(q)) score += 8;
      if (doc.tags && doc.tags.some(t => t.toLowerCase() === q)) score += 5;
      if (docTokens.has(q)) score += 2;
    }

    if (category && doc.category.toLowerCase() === category.toLowerCase()) {
      score += 5;
    }

    return { ...doc, _relevance: score };
  });

  return scored
    .filter(d => d._relevance > 0)
    .sort((a, b) => b._relevance - a._relevance)
    .slice(0, limit);
}

/**
 * Retrieves matching few-shot secure code templates for a prompt.
 */
function retrieveTemplates(query = "", { language, limit = 2 } = {}) {
  const queryTokens = tokenize(query);
  const scored = SECURE_CODE_TEMPLATES.map(tpl => {
    let score = 0;
    if (language && tpl.language === language.toLowerCase()) score += 10;
    for (const q of queryTokens) {
      if (tpl.tags.includes(q)) score += 6;
      if (tpl.title.toLowerCase().includes(q)) score += 4;
    }
    return { ...tpl, _relevance: score };
  });

  return scored
    .filter(t => t._relevance > 0)
    .sort((a, b) => b._relevance - a._relevance)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Groq-Powered Security Copilot (RAG Chat)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Answers security questions with citations from the RAG knowledge base and scan findings.
 *
 * @param {object} params
 * @param {string} params.query          - user's question
 * @param {string} [params.codeContext]  - active snippet or file
 * @param {Array}  [params.scanFindings] - current scan findings
 * @param {Array}  [params.chatHistory]  - previous messages [{role, content}]
 * @returns {Promise<{
 *   answer: string,
 *   citations: Array<object>,
 *   suggestedActions: Array<string>
 * }>}
 */
function isIdentityQuery(q = "") {
  const lower = q.toLowerCase().trim();
  return (
    /^(who are you|what (can|do) you do|introduce yourself|what is your purpose|what is this|how (can|do) you help)/i.test(lower) ||
    /who are you/i.test(lower) ||
    /what (u|you) can do/i.test(lower) ||
    /what are your capabilities/i.test(lower)
  );
}

function isUnrelatedGeneralQuery(q = "") {
  const lower = q.toLowerCase().trim();
  // Reject only queries that are completely outside software engineering, security, and this tool
  const unrelatedPatterns = [
    /^(tell me a joke|write a poem|sing a song|who is the president|what is the weather|what is the capital of|recipe for|translate this to french)/i,
    /^(how to cook|who won the match|tell me a story|movie recommendation)/i,
  ];
  return unrelatedPatterns.some(p => p.test(lower));
}

function isProjectSpecificQuery(q = "", codeContext = "", scanFindings = []) {
  const lower = q.toLowerCase().trim();
  const hasCode = Boolean(codeContext && codeContext.trim().length > 5);
  const hasFindings = Boolean(Array.isArray(scanFindings) && scanFindings.length > 0);

  // If query is completely unrelated general trivia/jokes/cooking
  if (isUnrelatedGeneralQuery(q)) {
    return false;
  }

  // If user has code or scan findings loaded
  if (hasCode || hasFindings) {
    return true;
  }

  // Allow all questions regarding fixing vulnerabilities, remediation, scanning, security concepts, and tools
  const securityAndToolKeywords = [
    'vulnerabilit', 'fix', 'patch', 'remediat', 'scan', 'finding', 'cwe', 'cve', 'owasp',
    'code', 'secret', 'key', 'token', 'sql', 'injection', 'xss', 'cors', 'auth', 'password',
    'secure', 'security', 'step', 'how to', 'how will', 'error', 'bug', 'leak', 'file', 'script',
    'project', 'repair', 'mitigat', 'protect', 'sanitize', 'audit', 'result'
  ];

  if (securityAndToolKeywords.some(k => lower.includes(k))) {
    return true;
  }

  return false;
}

/**
 * Answers security questions with citations from the RAG knowledge base and scan findings.
 * Strictly focused on the user's project, scanned code, and capabilities.
 */
async function askSecurityCopilot({
  query,
  codeContext = "",
  scanFindings = [],
  chatHistory = [],
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured in .env");
  }

  const cleanQuery = query.trim();

  // 1. Identity & capabilities query handler
  if (isIdentityQuery(cleanQuery)) {
    return {
      answer: "👋 I am **SecureCode Copilot**, your dedicated AI Project Security Auditor.\n\nHere is how I can help you with your project:\n* **Audit Scanned Code:** Inspect your project code for vulnerabilities (SQL Injection, XSS, exposed secrets, broken authentication).\n* **Explain Scan Findings:** Break down security issues detected during scans and connect them to official OWASP & CWE standards.\n* **Generate Secure Patches:** Provide tailored, copy-ready fixes to remediate vulnerabilities in your code.\n\nTo get started, paste or scan your code in **Code Scan** and ask me to audit it!",
      citations: [
        { id: "SecureCode-Core", title: "Project Security Auditor", owasp: "Application Defense", severity: "Info" }
      ],
      suggestedActions: ["Audit My Scan Findings", "Review My Scanned Code", "Check for Secrets in My Project"],
    };
  }

  // 1b. Code Generation Request Inquiry (e.g. "generate python code for...", "write code", etc.)
  const isGenCodeQuery =
    (
      /\b(generate|write|create|synthesize|build|give me|make|code me)\b/i.test(cleanQuery) &&
      /\b(code|python|javascript|java|c\+\+|html|css|sql|script|function|program|app|api|login|auth|calculator|adding|numbers|snippet)\b/i.test(cleanQuery)
    ) ||
    cleanQuery.toLowerCase().startsWith('generate') ||
    cleanQuery.toLowerCase().startsWith('write') ||
    cleanQuery.toLowerCase().startsWith('create') ||
    /generate code|write code|create code/i.test(cleanQuery);

  if (isGenCodeQuery && !isIdentityQuery(cleanQuery)) {
    return {
      answer: "💡 **I cannot generate new code directly in this Copilot chat.**\n\nPlease go to the **Generate Code** tab in the sidebar where you can ask for any code or feature. After generating it, you can click **'Analyze in Code Scan'** to run the AST-GNN security audit. Then, you can come back here and ask me to **inspect the findings or explain how to fix any vulnerable code present**!",
      citations: [
        { id: "GEN-GUIDE", title: "Secure Code Synthesizer", owasp: "Feature Guidance", severity: "Info" }
      ],
      suggestedActions: ["Go to Generate Code", "Audit My Scan Findings", "Review My Scanned Code"]
    };
  }

  // 2. Strict Project & Code Scope Check: Reject completely unrelated non-coding queries
  if (!isProjectSpecificQuery(cleanQuery, codeContext, scanFindings)) {
    return {
      answer: "🔒 **Project Scope Policy**: I only answer questions specifically related to your project, scanned code, and security remediation. Please ask about your code, scan findings, or security fixes.",
      citations: [],
      suggestedActions: ["How to fix vulnerabilities in my project", "Review My Scanned Code", "Audit My Scan Findings"],
    };
  }

  // 3. Retrieve relevant security knowledge for the project's issue
  const retrievedDocs = retrieveKnowledge(cleanQuery, { limit: 3 });

  const knowledgeSnippet = retrievedDocs.map((doc, idx) => `
[Citation #${idx + 1} - ${doc.id}: ${doc.title}]
OWASP: ${doc.owasp} | Severity: ${doc.severity}
Description: ${doc.description}
Standard Mitigation: ${doc.mitigation}
`).join("\n");

  const findingsSummary = scanFindings.length > 0
    ? scanFindings.map((f, i) => `#${i + 1} [${f.severity || 'Medium'}] ${f.type || f.category} at line ${f.line || 'N/A'}`).join("\n")
    : "No active scan findings.";

  const systemPrompt = `You are SecureCode Copilot, an automated Security Auditor specifically and exclusively dedicated to the user's active PROJECT, their SCANNED CODE, and their SCAN FINDINGS in SecureCode.

CURRENT PROJECT CODE:
${codeContext ? codeContext.slice(0, 2500) : "No code currently scanned/provided."}

CURRENT SCAN FINDINGS:
${findingsSummary}

GROUNDING SECURITY KNOWLEDGE:
${knowledgeSnippet || "No specific CWE article matched."}

MANDATORY RESPONSE FORMAT (CONCISE & STEP-BY-STEP):
Keep answers direct, structured, and punchy. Do NOT produce overly long essays or large boilerplates. Follow this exact concise 4-part structure:

1. **What is the Error**:
Briefly list the specific vulnerability name and exact line numbers detected in the project.

2. **What Will Happen If Not Fixed (Risk & Impact)**:
In 1-2 concise sentences, state the real-world consequence if left unfixed (e.g. credential theft, API abuse, unauthorized access, data breach).

3. **How to Fix It in SecureCode (Step-by-Step)**:
State the exact ways the user can remediate it inside SecureCode:
- **Option A (Fix Individually)**: Go to the **Scan Results** page, select the finding, and click **"⚡ Apply Fix to Code"** to replace the line with secure code and see the changes reflected in **Code Scan**.
- **Option B (Fix All at Once)**: Go to the **Scan Results** page and click **"⚡ Fix All"** in the header or filter bar to fix all open vulnerabilities across the file at once.
- **Option C (Copy Fix)**: Go to the **Scan Results** page and click **"Copy Fix"** to copy the corrected code snippet manually.
- **Option D (Auto Repair)**: Click **"Auto Repair"** to generate an automatic refactored patch.

4. **Corrected Code Snippet**:
Provide only the minimal, clean corrected replacement code line(s) for the detected lines (e.g., using os.environ.get()).`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-4),
    { role: "user", content: query },
  ];

  const payload = {
    model: MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 1024,
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawAnswer = data.choices?.[0]?.message?.content || "No response generated.";

  return {
    answer: rawAnswer,
    citations: retrievedDocs.map(d => ({
      id: d.id,
      title: d.title,
      owasp: d.owasp,
      severity: d.severity,
      mitigation: d.mitigation,
    })),
    suggestedActions: [
      "Explain remediation steps",
      "Show secure code fix",
      "Check OWASP Top 10 rule",
    ],
  };
}

module.exports = {
  SECURITY_KNOWLEDGE_BASE,
  SECURE_CODE_TEMPLATES,
  retrieveKnowledge,
  retrieveTemplates,
  askSecurityCopilot,
};
