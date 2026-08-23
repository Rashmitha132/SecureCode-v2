// repairModule.js
// Phase 3 of SecureCode v2: Automatic Vulnerability Repair.
//
// Takes buggy code along with detected findings (from Pattern, LLM, or GNN detectors),
// and uses Groq (LLaMA 3.3 70B) to generate a secure, idiomatic patched version
// of the code accompanied by explanations of the fix.

require("dotenv").config();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/**
 * Builds the repair system prompt to ensure the output contains only structured JSON
 * with the repaired code and remediation summary.
 */
const REPAIR_SYSTEM_PROMPT = `You are a Principal Security Engineer and Code Repair Specialist.
Your task is to fix security vulnerabilities, flaws, and logic bugs in user-supplied code while preserving its intended business logic and behavior.

Rules you MUST follow:
1. Fix all identified vulnerabilities (e.g. SQL/command injection, authentication bypass, unvalidated input, resource leaks, logic errors, exposed secrets).
2. Maintain original function names, variable naming conventions, and logic flow as closely as possible.
3. Apply standard security best practices (e.g. parameterized queries, input validation, defensive null checks, try-finally/context managers).
4. Return ONLY a valid JSON object matching this exact schema:
{
  "repairedCode": "<COMPLETE_REPAIRED_CODE_AS_STRING>",
  "explanation": "<CONCISE_EXPLANATION_OF_CHANGES_AND_WHY_THEY_FIX_THE_ISSUES>",
  "changesCount": <INTEGER_ESTIMATE_OF_MODIFIED_LINES>
}
5. Do NOT include markdown fences, preambles, or text outside the JSON object.`;

const { retrieveKnowledge } = require("./ragEngine");

/**
 * Strips potential markdown wrapping from LLM output.
 */
function cleanJsonResponse(rawText) {
  return rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Generates an automatic patch/repair for vulnerable code, grounded with RAG security knowledge.
 *
 * @param {object} params
 * @param {string} params.code         - original source code to repair
 * @param {Array}  params.findings     - list of detected findings (from /scan)
 * @param {string} [params.language]   - language key (e.g., 'python', 'javascript')
 * @returns {Promise<{
 *   repairedCode: string,
 *   explanation: string,
 *   changesCount: number,
 *   ragCitations: Array<object>,
 *   model: string,
 *   repairedAt: string
 * }>}
 */
async function repairCode({ code, findings = [], language = "python" }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured in .env");
  }

  if (!code || !code.trim()) {
    throw new Error("Cannot repair empty code");
  }

  // 1. Query RAG knowledge base for matching CWE/OWASP articles based on detected findings
  const searchQueries = findings.map(f => `${f.type || ''} ${f.category || ''} ${f.cwe || ''}`).join(" ");
  const ragDocs = retrieveKnowledge(searchQueries || code.slice(0, 200), { limit: 3 });

  const ragContextBlock = ragDocs.length > 0
    ? `\n\nOfficial Security Knowledge & Mitigations (RAG):\n` +
      ragDocs.map((d, i) => `[Rule #${i+1} ${d.id}: ${d.title}]\nMitigation Guide: ${d.mitigation}`).join("\n\n")
    : "";

  // Format findings for context
  const findingsSummary = findings.length > 0
    ? findings.map((f, i) => `${i + 1}. [${f.severity || "High"}] ${f.type || f.category}: ${f.explanation || ""}${f.line ? ` (line ${f.line})` : ""}`).join("\n")
    : "General code inspection: check for security defects, injection points, and logic errors.";

  const userPrompt = `Language: ${language}

Original Code:
\`\`\`${language}
${code}
\`\`\`

Identified Security Issues:
${findingsSummary}
${ragContextBlock}

Please generate a secure, repaired version of this code fixing all identified issues according to the RAG mitigation standards.`;

  const startedAt = Date.now();

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2, // Low temperature for high fidelity code generation
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REPAIR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Groq repair API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = cleanJsonResponse(rawContent);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Could not parse repair JSON output:", cleaned.slice(0, 300));
    throw new Error("Failed to parse repair patch from AI model");
  }

  return {
    repairedCode: parsed.repairedCode || code,
    explanation: parsed.explanation || "Security improvements and bug fixes applied.",
    changesCount: typeof parsed.changesCount === "number" ? parsed.changesCount : 1,
    ragCitations: ragDocs.map(d => ({ id: d.id, title: d.title, owasp: d.owasp, severity: d.severity, mitigation: d.mitigation })),
    model: data.model || MODEL,
    repairedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { repairCode };
