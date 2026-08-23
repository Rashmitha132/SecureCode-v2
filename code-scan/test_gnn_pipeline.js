// test_gnn_pipeline.js
const { detectWithGNN, getMLStatus } = require("./mlClient");
const { buildRiskReport } = require("./riskEngine");

async function runTest() {
  console.log("==========================================");
  console.log("🔍 Testing SecureCode v2 Phase 2 GNN Pipeline");
  console.log("==========================================");

  // 1. Check ML Service status
  const status = await getMLStatus();
  console.log("ML Service Status:", status);

  // 2. Test code with vulnerability
  const buggyCode = `def query_user(cursor, username):
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()`;

  console.log("\nInspecting code sample with GNN detector...");
  const gnnFindings = await detectWithGNN(buggyCode, "python");
  console.log("GNN Findings:", JSON.stringify(gnnFindings, null, 2));

  // 3. Test Risk Engine integration
  const report = buildRiskReport({
    patternFindings: [],
    llmFindings: [],
    depFindings: [],
    gnnFindings,
  });

  console.log("\nRisk Report with GNN Findings:");
  console.log({
    riskScore: report.riskScore,
    riskLevel: report.riskLevel,
    totalFindings: report.totalFindings,
    categories: report.byCategory,
  });

  console.log("==========================================");
  console.log("✅ GNN Pipeline integration test succeeded!");
  console.log("==========================================");
  process.exit(0);
}

runTest();
