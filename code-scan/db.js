// db.js — Dual-mode MySQL Connection Pool with Seamless Local Fallback
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const mysql = require("mysql2/promise");

const DB_FILE = path.join(__dirname, "scan_history_fallback.json");

let isMySQLConnected = false;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "SecureCode",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    isMySQLConnected = true;
    console.log("Connected to MySQL (SecureCode database)");
    conn.release();
  } catch (err) {
    isMySQLConnected = false;
    console.log("[SecureCode] MySQL not reachable — using resilient local history store.");
  }
}

testConnection();

// Fallback Helper Functions
function readFallbackHistory() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) || [];
  } catch {
    return [];
  }
}

function writeFallbackHistory(history) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local history:", err.message);
  }
}

// Export a smart DB interface
module.exports = {
  query: async (sql, params = []) => {
    if (isMySQLConnected) {
      try {
        return await pool.query(sql, params);
      } catch (err) {
        console.warn("MySQL query error, using fallback:", err.message);
      }
    }

    // Local file fallback logic for INSERT and SELECT
    const upperSql = (sql || "").trim().toUpperCase();
    if (upperSql.startsWith("INSERT INTO SCAN_HISTORY")) {
      const history = readFallbackHistory();
      const newEntry = {
        id: history.length + 1,
        scanned_at: new Date().toISOString(),
        total_findings: params[0] || 0,
        high_severity: params[1] || 0,
        medium_severity: params[2] || 0,
        low_severity: params[3] || 0,
        findings_json: params[4] || "[]",
        risk_score: params[5] || 0,
        risk_level: params[6] || "Low",
      };
      history.unshift(newEntry);
      writeFallbackHistory(history.slice(0, 100));
      return [{ insertId: newEntry.id }];
    }

    if (upperSql.startsWith("SELECT")) {
      const history = readFallbackHistory();
      return [history];
    }

    if (upperSql.startsWith("DELETE FROM SCAN_HISTORY")) {
      writeFallbackHistory([]);
      return [{ affectedRows: 1 }];
    }

    return [[]];
  },
  getConnection: () => pool.getConnection(),
};