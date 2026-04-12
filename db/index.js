const { Pool } = require("pg");

let pool = null;

if (!process.env.DATABASE_URL) {
  console.warn("[DB] DATABASE_URL not set - database features disabled");
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

module.exports = pool;
