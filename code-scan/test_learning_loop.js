// test_learning_loop.js
const {
  recordExample,
  recordFeedback,
  getFewShotExamples,
  checkAndTriggerRetraining,
  getStats
} = require("./learningService");

async function runTest() {
  console.log("==================================================");
  console.log("🧠 Testing SecureCode v2 Phase 4 Self-Learning Loop");
  console.log("==================================================");

  // 1. Record a high-quality generation example with positive feedback
  console.log("1. Recording verified generation example...");
  const recordRes = await recordExample({
    prompt: "Write a secure hash verification function in Python",
    generatedCode: `import hashlib\nimport hmac\n\ndef verify_token(secret, token, expected_hash):\n    computed = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()\n    return hmac.compare_digest(computed, expected_hash)`,
    language: "python",
    actualOutcome: "clean",
    userRating: 1,
    passRate: 1.0,
    feedbackSource: "user_feedback",
    modelVersion: 2,
  });
  console.log("Recorded Example:", recordRes);

  // 2. Test Few-Shot RAG retrieval for generator
  console.log("\n2. Testing Few-Shot RAG retrieval from learning memory...");
  const fewShot = await getFewShotExamples("python", 2);
  console.log(`Retrieved ${fewShot.length} few-shot example(s) for generator prompt.`);
  if (fewShot.length > 0) {
    console.log("Sample Prompt:", fewShot[0].prompt);
  }

  // 3. Record feedback and trigger retraining
  console.log("\n3. Testing Feedback recording...");
  await recordFeedback({ rating: 1, actualOutcome: "clean", isGnnCorrect: true });
  console.log("Feedback recorded successfully.");

  // 4. Query learning statistics
  console.log("\n4. Querying Learning Statistics for Dashboard...");
  const stats = await getStats();
  console.log("Dashboard Learning Stats:", {
    totalExamples: stats.totalExamples,
    positiveFeedback: stats.positiveFeedback,
    totalIterations: stats.totalIterations,
    latestAccuracy: stats.latestIteration?.gnn_accuracy,
    latestF1: stats.latestIteration?.gnn_f1,
  });

  console.log("\n==================================================");
  console.log("✅ Self-Learning Loop test completed successfully!");
  console.log("==================================================");
  process.exit(0);
}

runTest();
