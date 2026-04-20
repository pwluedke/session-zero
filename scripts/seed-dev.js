require("dotenv").config();
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || "";
if (!url) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}
if (url.includes("railway")) {
  console.error("DATABASE_URL points at Railway (production). Refusing to seed.");
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL not set in .env -- cannot seed admin user.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const USERS = [
  { google_id: "seed_admin",                email: adminEmail,                 display_name: "Paul Luedke",          approved: true,  role: "admin", ai_enabled: true,  ai_daily_limit: null },
  { google_id: "seed_zerosession0",         email: "zerosession0@gmail.com",   display_name: "Session Zero Test",    approved: false, role: "user",  ai_enabled: false, ai_daily_limit: 20   },
  { google_id: "seed_alice_example_com",    email: "alice@example.com",        display_name: "Alice Approved",       approved: true,  role: "user",  ai_enabled: true,  ai_daily_limit: 10   },
  { google_id: "seed_bob_example_com",      email: "bob@example.com",          display_name: "Bob Approved",         approved: true,  role: "user",  ai_enabled: false, ai_daily_limit: 20   },
  { google_id: "seed_carol_example_com",    email: "carol@example.com",        display_name: "Carol Pending",        approved: false, role: "user",  ai_enabled: false, ai_daily_limit: 20   },
  { google_id: "seed_dave_example_com",     email: "dave@example.com",         display_name: "Dave Pending",         approved: false, role: "user",  ai_enabled: false, ai_daily_limit: 20   },
];

const ALICE_GAMES = [
  { name: "Codenames",                          type: "Party",     complexity: "Low",    min_players: 2, max_players: 8, play_time: 15,  age: 14, setup_time: 2,  rating: 5,    played: true,  cooperative: false },
  { name: "Catan",                              type: "Board",     complexity: "Medium", min_players: 3, max_players: 6, play_time: 90,  age: 10, setup_time: 10, rating: 4,    played: true,  cooperative: false },
  { name: "Pandemic",                           type: "Board",     complexity: "Medium", min_players: 2, max_players: 4, play_time: 60,  age: 8,  setup_time: 10, rating: 5,    played: true,  cooperative: true  },
  { name: "Azul",                               type: "Board",     complexity: "Medium", min_players: 2, max_players: 4, play_time: 45,  age: 8,  setup_time: 5,  rating: null, played: false, cooperative: false },
  { name: "Gloomhaven: Jaws of the Lion",       type: "Narrative", complexity: "High",   min_players: 1, max_players: 4, play_time: 60,  age: 14, setup_time: 15, rating: null, played: false, cooperative: true  },
  { name: "Betrayal at House on the Hill",      type: "Mystery",   complexity: "Medium", min_players: 3, max_players: 6, play_time: 90,  age: 12, setup_time: 5,  rating: 4,    played: true,  cooperative: false },
  { name: "Blokus",                             type: "Abstract",  complexity: "Low",    min_players: 2, max_players: 4, play_time: 30,  age: 7,  setup_time: 1,  rating: 4,    played: true,  cooperative: false },
];

const BOB_GAMES = [
  { name: "Coup",                               type: "Card",      complexity: "Low",    min_players: 2, max_players: 6, play_time: 15,  age: 10, setup_time: 2,  rating: null, played: false, cooperative: false },
  { name: "Catan Dice",                         type: "Dice",      complexity: "Low",    min_players: 1, max_players: 6, play_time: 30,  age: 7,  setup_time: 2,  rating: 3,    played: true,  cooperative: false },
  { name: "Arkham Horror (3rd Edition)",        type: "Board",     complexity: "High",   min_players: 1, max_players: 6, play_time: 240, age: 14, setup_time: 60, rating: null, played: false, cooperative: true  },
  { name: "Pandemic",                           type: "Board",     complexity: "Medium", min_players: 2, max_players: 4, play_time: 60,  age: 8,  setup_time: 10, rating: 5,    played: true,  cooperative: true  },
  { name: "Codenames",                          type: "Party",     complexity: "Low",    min_players: 2, max_players: 8, play_time: 15,  age: 14, setup_time: 2,  rating: 4,    played: true,  cooperative: false },
  { name: "Azul",                               type: "Board",     complexity: "Medium", min_players: 2, max_players: 4, play_time: 45,  age: 8,  setup_time: 5,  rating: null, played: false, cooperative: false },
];

async function seedGames(userId, games) {
  const { rows } = await pool.query("SELECT COUNT(*) FROM games WHERE user_id = $1", [userId]);
  if (parseInt(rows[0].count) > 0) return 0;
  for (const g of games) {
    await pool.query(
      `INSERT INTO games (user_id, name, type, complexity, min_players, max_players, play_time, age, setup_time, rating, played, cooperative, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual')`,
      [userId, g.name, g.type, g.complexity, g.min_players, g.max_players, g.play_time, g.age, g.setup_time, g.rating, g.played, g.cooperative]
    );
  }
  return games.length;
}

async function main() {
  let inserted = 0;
  let skipped = 0;
  let gamesInserted = 0;

  const userIds = {};

  for (const u of USERS) {
    const result = await pool.query(
      `INSERT INTO users (google_id, email, display_name, approved, role, ai_enabled, ai_daily_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [u.google_id, u.email, u.display_name, u.approved, u.role, u.ai_enabled, u.ai_daily_limit]
    );
    if (result.rows.length > 0) {
      userIds[u.email] = result.rows[0].id;
      inserted++;
    } else {
      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
      userIds[u.email] = existing.rows[0].id;
      skipped++;
    }
  }

  if (userIds["alice@example.com"]) {
    gamesInserted += await seedGames(userIds["alice@example.com"], ALICE_GAMES);
  }
  if (userIds["bob@example.com"]) {
    gamesInserted += await seedGames(userIds["bob@example.com"], BOB_GAMES);
  }

  console.log(`Seed complete.`);
  console.log(`  Users inserted: ${inserted}`);
  console.log(`  Users skipped (already existed): ${skipped}`);
  console.log(`  Games inserted: ${gamesInserted}`);

  await pool.end();
}

main().catch(err => {
  console.error("Seed failed:", err.message);
  pool.end();
  process.exit(1);
});
