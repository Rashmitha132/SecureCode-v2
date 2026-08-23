// test_repair_pipeline.js
const { repairCode } = require("./repairModule");

async function runTest() {
  console.log("==========================================");
  console.log("🛠️  Testing SecureCode v2 Phase 3 Auto-Repair");
  console.log("==========================================");

  const buggySnippet = `import sqlite3

def get_user_data(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SQL Injection flaw
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    data = cursor.fetchall()
    return data`;

  const findings = [
    {
      type: "SQL Injection",
      category: "Injection Vulnerabilities",
      severity: "High",
      line: 7,
      explanation: "Direct concatenation of user input into raw SQL string allows SQL injection.",
      fix: "Use parameterized queries with ? or %s placeholders."
    }
  ];

  console.log("Submitting code to repairModule...");
  try {
    const result = await repairCode({
      code: buggySnippet,
      findings,
      language: "python"
    });

    console.log("\n[REPAIR RESULT]");
    console.log("Model Used:", result.model);
    console.log("Duration:", result.durationMs, "ms");
    console.log("Estimated Lines Changed:", result.changesCount);
    console.log("Explanation:\n", result.explanation);
    console.log("\nRepaired Code:\n------------------------------------------\n" + result.repairedCode + "\n------------------------------------------");

    console.log("==========================================");
    console.log("✅ Auto-Repair pipeline test succeeded!");
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Repair test failed:", err.message);
  }

  process.exit(0);
}

runTest();
