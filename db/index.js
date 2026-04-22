const { Pool, types } = require("pg");

// pg returns DATE columns as JS Date objects by default.
// String(dateObj).split('T')[0] splits on the 'T' in "GMT", not the date/time boundary.
// Return DATE values as plain 'YYYY-MM-DD' strings instead.
types.setTypeParser(1082, val => val);

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
