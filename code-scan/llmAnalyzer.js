// llmAnalyzer.js
// Semantic vulnerability analysis using Groq (free tier, OpenAI-compatible API).
// detectors.js catches things that LOOK like secrets via regex/entropy.
// This module actually understands what the code DOES: broken auth, missing
// access checks, injection points, insecure configs, and logic bugs — the
// stuff no regex can ever catch, and the reason this tool is "AI-assisted"
// rather than just another pattern-matching scanner.
//
// Requires Node 18+ (uses the built-in global `fetch`).
// Get a free API key (no credit card) at https://console.groq.com/

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are a senior application security engineer performing a code review.
Analyze the code the user provides and identify REAL, concrete security issues only in these categories:
- Injection (SQL injection, command injection, XSS, path traversal, etc.)
- Broken authentication (weak/missing auth checks, hardcoded credentials used for auth, insecure session handling)
- Improper access control (missing authorization checks, IDOR, privilege escalation)
- Insecure configuration (debug mode enabled, permissive CORS, disabled TLS verification, verbose error leakage)
- Logic errors with security impact (e.g. off-by-one in access checks, incorrect boolean logic in validation)

Do NOT flag hardcoded secrets/API keys/tokens — a separate tool already handles that.
Do NOT flag purely stylistic or performance issues.
If the code has no real issues in scope, return an empty array.

Respond with ONLY a raw JSON array (no markdown fences, no prose before or after, no explanation outside the JSON). Each element must have exactly this shape:
{
  "category": "Injection" | "Broken Authentication" | "Access Control" | "Insecure Configuration" | "Logic Error",
  "type": "short human-readable name of the specific issue",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "line": <exact integer line number where the faulty code resides in the provided code>,
  "vulnerableCode": "<THE EXACT FAULTY LINE OR 1-3 LINES OF CODE AT THIS LINE NUMBER IN USER'S INPUT>",
  "correctedCode": "<THE EXACT SECURE REPLACEMENT CODE FOR THAT LINE OR FUNCTION>",
  "explanation": "1-2 plain-English sentences on why this is exploitable and what the impact is",
  "fix": "1-2 sentences on how to fix it, concrete enough for a developer to act on",
  "confidence": <float between 0 and 1, how sure you are this is a genuine, exploitable issue>
}`;

async function analyzeWithLLM(code, { fileName = null } = {}) {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — skipping LLM analysis");
    return [];
  }
  if (!code || !code.trim()) return [];

  const userPrompt = fileName
    ? `File: ${fileName}\n\n\`\`\`\n${code}\n\`\`\``
    : `\`\`\`\n${code}\n\`\`\``;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 2000,
        // Groq supports forcing valid JSON output directly — removes the
        // need to manually strip markdown fences most of the time.
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              SYSTEM_PROMPT +
              `\n\nWrap the array in a single JSON object like this: {"findings": [...]} since the API requires a top-level JSON object, not a bare array.`,
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return [];
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim() || "";

    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsedObj;
    try {
      parsedObj = JSON.parse(cleaned);
    } catch {
      console.error("Could not parse LLM response as JSON:", cleaned.slice(0, 300));
      return [];
    }

    // Model was asked to wrap the array as { "findings": [...] }
    const parsed = Array.isArray(parsedObj) ? parsedObj : parsedObj.findings;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      type: item.type || "Unspecified issue",
      category: item.category || "Logic Error",
      severity: ["Critical", "High", "Medium", "Low"].includes(item.severity) ? item.severity : "Medium",
      line: Number.isInteger(item.line) ? item.line : null,
      explanation: item.explanation || "",
      fix: item.fix || "",
      confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      method: "llm",
      matchPreview: item.type || "",
    }));
  } catch (err) {
    console.error("LLM analysis failed:", err.message);
    return [];
  }
}

module.exports = { analyzeWithLLM };