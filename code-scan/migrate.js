// migrate.js
// Migration script for SecureCode v2 database schema updates.
// Run: node migrate.js

require("dotenv").config();
const pool = require("./db");

async function runMigrations() {
  console.log("Running SecureCode v2 database migrations...");

  try {
    // 1. Update scan_history with source metadata & repair fields
    try {
      await pool.query(`
        ALTER TABLE scan_history
          ADD COLUMN source_prompt TEXT NULL AFTER findings_json,
          ADD COLUMN generation_model VARCHAR(100) NULL AFTER source_prompt,
          ADD COLUMN source_type ENUM('manual','generated') DEFAULT 'manual' AFTER generation_model,
          ADD COLUMN repair_attempted BOOLEAN DEFAULT FALSE AFTER source_type,
          ADD COLUMN repair_accepted BOOLEAN DEFAULT NULL AFTER repair_attempted,
          ADD COLUMN repaired_code LONGTEXT NULL AFTER repair_accepted
      `);
      console.log("✅ Updated scan_history table with v2 columns.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME" || err.message.includes("Duplicate column name")) {
        console.log("ℹ️ scan_history columns already up to date.");
      } else {
        console.warn("⚠️ Warning updating scan_history:", err.message);
      }
    }

    // 2. Create learning_examples table for self-learning loop
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_examples (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prompt TEXT,
        generated_code LONGTEXT,
        language VARCHAR(50),
        gnn_prediction VARCHAR(20),
        gnn_confidence FLOAT,
        gnn_version INT,
        llm_prediction VARCHAR(20),
        actual_outcome VARCHAR(20),
        was_gnn_correct BOOLEAN,
        was_repaired BOOLEAN DEFAULT FALSE,
        repaired_code LONGTEXT,
        repair_accepted BOOLEAN,
        user_rating TINYINT,
        pass_rate FLOAT,
        feedback_source VARCHAR(50),
        model_version INT,
        used_in_training BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Verified/Created learning_examples table.");

    // 3. Create learning_iterations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_iterations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        iteration INT NOT NULL UNIQUE,
        trained_on_count INT,
        gnn_accuracy FLOAT,
        gnn_f1 FLOAT,
        gnn_auc FLOAT,
        gnn_version INT,
        model_path VARCHAR(200),
        generator_pass_at_1 FLOAT,
        generator_examples INT,
        total_examples_seen INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Verified/Created learning_iterations table.");

    console.log("🎉 All migrations completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    process.exit(0);
  }
}

runMigrations();
