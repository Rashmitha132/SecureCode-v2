// db.js
// MySQL connection pool. A pool (not a single connection) is used because
// it automatically manages multiple simultaneous requests without you
// having to manually open/close connections per request.

require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD, // now read from .env — never hardcode this
  database: process.env.DB_NAME || "SecureCode",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Quick check on startup so a bad password/connection fails loudly and
// immediately, instead of silently breaking the first time someone checks
// a password
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL (SecureCode database)");
    conn.release();
  } catch (err) {
    console.error("Could not connect to MySQL:", err.message);
  }
}

testConnection();

module.exports = pool;