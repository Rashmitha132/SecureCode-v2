// codeGenerator.js
// Phase 1 of SecureCode v2: AI-powered code generation.
//
// Takes a natural-language prompt and returns working code in the requested
// language. Uses the same Groq API that llmAnalyzer.js already uses so we
// don't need any new credentials or dependencies.
//
// Design goals:
//   1. Output ONLY clean code — no markdown fences, no prose preamble.
//   2. Be language-aware: the system prompt adapts per language.
//   3. Fail loudly on Groq errors so the caller can surface them to the UI.
//   4. Strip accidental markdown leakage before returning (LLMs sometimes
//      ignore instructions when they feel like it).

require("dotenv").config();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Primary model on Groq for code generation
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Languages the endpoint accepts. Keeping this list explicit so we can
// return a helpful 400 rather than sending bad input to Groq.
const SUPPORTED_LANGUAGES = [
  "javascript",
  "python",
  "typescript",
  "java",
  "go",
  "cpp",
];

// Maps each language key to the token/comment style used in the system
// prompt so Groq understands the expected output format.
const LANGUAGE_META = {
  javascript: { display: "JavaScript", ext: "js", comment: "//" },
  python:     { display: "Python",     ext: "py", comment: "#" },
  typescript: { display: "TypeScript", ext: "ts", comment: "//" },
  java:       { display: "Java",       ext: "java", comment: "//" },
  go:         { display: "Go",         ext: "go", comment: "//" },
  cpp:        { display: "C++",        ext: "cpp", comment: "//" },
};

/**
 * Builds the system prompt that steers Groq toward clean code output.
 * The prompt is language-specific so Java gets class boilerplate, Python
 * gets idiomatic style guidance, etc.
 *
 * @param {string} language - one of SUPPORTED_LANGUAGES
 * @returns {string}
 */
function buildSystemPrompt(language) {
  const meta = LANGUAGE_META[language];
  return `You are an expert ${meta.display} software engineer.
The user will give you a natural-language description of code they want.
Your job is to write that code — and ONLY that code.

Rules you MUST follow:
1. Output ONLY valid ${meta.display} code. No markdown. No code fences (\`\`\`). No explanatory prose.
2. The first character of your response must be the first character of the code.
3. Include brief inline comments (${meta.comment}) where they help clarity, but keep them terse.
4. Write production-quality code: handle edge cases, avoid obvious security issues.
5. If the request is ambiguous, make reasonable assumptions and implement the most common interpretation.
6. Do NOT include any text before or after the code block.
7. Do NOT wrap the code in any kind of delimiter.`;
}

/**
 * Strips markdown fences that Groq sometimes emits despite the prompt.
 * Handles: ```python\n...\n```, ```\n...\n```, and bare ``` at start/end.
 *
 * @param {string} raw - raw LLM response text
 * @returns {string} - clean code string
 */
function stripMarkdownFences(raw) {
  // Remove opening fence: ```language or just ```
  let cleaned = raw.replace(/^```[a-zA-Z+]*\r?\n?/m, "");
  // Remove closing fence
  cleaned = cleaned.replace(/\r?\n?```\s*$/m, "");
  return cleaned.trim();
}

const { retrieveTemplates } = require("./ragEngine");

/**
 * Generates code from a natural-language prompt using the Groq API augmented with RAG templates.
 *
 * @param {string} prompt    - the user's natural-language description
 * @param {string} language  - one of SUPPORTED_LANGUAGES
 * @param {string[]} [fewShotExamples] - optional array of prior good examples
 * @returns {Promise<{
 *   code: string,
 *   language: string,
 *   model: string,
 *   tokensUsed: number,
 *   promptTokens: number,
 *   ragTemplatesUsed: Array<object>,
 *   generatedAt: string
 * }>}
 */
async function generateCode(prompt, language = "python", fewShotExamples = null) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in .env — cannot generate code.");
  }

  const normalizedLang = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    throw new Error(
      `Unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
    );
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt cannot be empty.");
  }

  // 1. Retrieve RAG secure code templates
  const ragTemplates = retrieveTemplates(prompt, { language: normalizedLang, limit: 2 });

  // 2. Retrieve top-rated prior examples from learning loop
  let examples = fewShotExamples;
  if (!examples) {
    try {
      const { getFewShotExamples } = require("./learningService");
      examples = await getFewShotExamples(normalizedLang, 2);
    } catch {
      examples = [];
    }
  }

  // Build the messages array. RAG verified templates + high-quality past examples injected as few-shots
  const messages = [
    { role: "system", content: buildSystemPrompt(normalizedLang) },
  ];

  for (const tpl of ragTemplates) {
    messages.push({ role: "user", content: `Write production secure code for: ${tpl.title}` });
    messages.push({ role: "assistant", content: tpl.code });
  }

  for (const ex of examples) {
    if (ex.prompt && ex.code) {
      messages.push({ role: "user", content: `Write code for: ${ex.prompt}` });
      messages.push({ role: "assistant", content: ex.code });
    }
  }

  messages.push({ role: "user", content: prompt.trim() });

  const startedAt = Date.now();

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,   // low temp → more deterministic, fewer hallucinations
      max_tokens: 4096,   // generous limit — complex functions can be long
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "(no body)");
    throw new Error(`Groq API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawCode = data.choices?.[0]?.message?.content || "";
  const code = stripMarkdownFences(rawCode);

  if (!code) {
    throw new Error("Groq returned an empty response — please try a different prompt.");
  }

  return {
    code,
    language: normalizedLang,
    model: data.model || MODEL,
    tokensUsed: data.usage?.total_tokens ?? 0,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    ragTemplatesUsed: ragTemplates.map(t => ({ id: t.id, title: t.title })),
    generatedAt: new Date().toISOString(),
    generationMs: Date.now() - startedAt,
  };
}

module.exports = { generateCode, SUPPORTED_LANGUAGES, LANGUAGE_META };
