const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function migrate() {
  if (!pool) {
    console.log("[DB] Skipping migration - no database connection");
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  try {
    await pool.query(sql);
    console.log("[DB] Schema migration complete");
  } catch (err) {
    console.error("[DB] Migration failed:", err.message);
  }
}

module.exports = migrate;
