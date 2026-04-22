require('dotenv').config();
const { Pool } = require('pg');
const seedrandom = require('seedrandom');

// --- Guards ---
const url = process.env.DATABASE_URL || '';
if (!url) { console.error('DATABASE_URL is not set. Aborting.'); process.exit(1); }
if (url.includes('railway')) { console.error('DATABASE_URL points at Railway (production). Refusing to seed.'); process.exit(1); }

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) { console.error('ADMIN_EMAIL not set in .env. Aborting.'); process.exit(1); }

const testUserEmail = process.env.TEST_USER_EMAIL;
if (!testUserEmail) { console.error('TEST_USER_EMAIL not set in .env. Aborting.'); process.exit(1); }

const pool = new Pool({ connectionString: url });
const rng = seedrandom('dungeon-crawler-carl');

// --- PRNG helpers ---
function ri(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN(arr, n) { return shuffled(arr).slice(0, Math.min(n, arr.length)); }

function dateAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Weekend-weighted random date within the last maxBack days.
// Tries to land on Saturday or Sunday; falls back to any day after 5 attempts.
function randomDate(maxBack = 180) {
  for (let i = 0; i < 5; i++) {
    const days = ri(0, maxBack);
    const d = new Date();
    d.setDate(d.getDate() - days);
    if (d.getDay() === 0 || d.getDay() === 6) return d.toISOString().split('T')[0];
  }
  return dateAgo(ri(0, maxBack));
}

// --- Game and player definitions ---
const GAME_DEFS = [
  { name: 'Small World',                   type: 'Strategy', complexity: 'Medium Light', min_players: 2, max_players: 5, play_time: 80,  bgg_id: 40692,  cooperative: false },
  { name: 'Wingspan',                      type: 'Strategy', complexity: 'Medium',       min_players: 1, max_players: 5, play_time: 70,  bgg_id: 266192, cooperative: false },
  { name: 'Pandemic',                      type: 'Strategy', complexity: 'Medium Light', min_players: 2, max_players: 4, play_time: 45,  bgg_id: 30549,  cooperative: true  },
  { name: 'Ticket to Ride',                type: 'Family',   complexity: 'Light',        min_players: 2, max_players: 5, play_time: 60,  bgg_id: 9209,   cooperative: false },
  { name: 'Catan',                         type: 'Family',   complexity: 'Medium Light', min_players: 3, max_players: 4, play_time: 90,  bgg_id: 13,     cooperative: false },
  { name: 'Arkham Horror',                 type: 'Strategy', complexity: 'Heavy',        min_players: 1, max_players: 8, play_time: 180, bgg_id: 257499, cooperative: true  },
  { name: 'Splendor',                      type: 'Family',   complexity: 'Light',        min_players: 2, max_players: 4, play_time: 30,  bgg_id: 148228, cooperative: false },
  { name: 'Codenames',                     type: 'Party',    complexity: 'Light',        min_players: 2, max_players: 8, play_time: 15,  bgg_id: 178900, cooperative: false },
  { name: 'Spirit Island',                 type: 'Strategy', complexity: 'Heavy',        min_players: 1, max_players: 4, play_time: 120, bgg_id: 162886, cooperative: true  },
  { name: 'Azul',                          type: 'Abstract', complexity: 'Medium Light', min_players: 2, max_players: 4, play_time: 45,  bgg_id: 230802, cooperative: false },
  { name: 'Terraforming Mars',             type: 'Strategy', complexity: 'Medium Heavy', min_players: 1, max_players: 5, play_time: 120, bgg_id: 167791, cooperative: false },
  { name: 'Dominion',                      type: 'Strategy', complexity: 'Medium Light', min_players: 2, max_players: 4, play_time: 30,  bgg_id: 36218,  cooperative: false },
  { name: '7 Wonders',                     type: 'Strategy', complexity: 'Medium Light', min_players: 2, max_players: 7, play_time: 30,  bgg_id: 68448,  cooperative: false },
  { name: 'Root',                          type: 'Strategy', complexity: 'Medium Heavy', min_players: 2, max_players: 4, play_time: 90,  bgg_id: 237182, cooperative: false },
  { name: 'Betrayal at House on the Hill', type: 'Thematic', complexity: 'Medium Light', min_players: 3, max_players: 6, play_time: 60,  bgg_id: 10547,  cooperative: false },
  { name: 'Coup',                          type: 'Party',    complexity: 'Light',        min_players: 2, max_players: 6, play_time: 15,  bgg_id: 131357, cooperative: false },
  { name: 'Dead of Winter',                type: 'Thematic', complexity: 'Medium Heavy', min_players: 2, max_players: 5, play_time: 100, bgg_id: 150376, cooperative: false },
  { name: 'Everdell',                      type: 'Strategy', complexity: 'Medium',       min_players: 1, max_players: 4, play_time: 80,  bgg_id: 199792, cooperative: false },
];

const PLAYER_DEFS = [
  { name: 'Carl',           emoji: '⚔️',  color: '#e74c3c' },
  { name: 'Princess Donut', emoji: '👑',  color: '#9b59b6' },
  { name: 'Mordecai',       emoji: '🎩',  color: '#2c3e50' },
  { name: 'Bautista',       emoji: '💪',  color: '#e67e22' },
  { name: 'Katia',          emoji: '🌟',  color: '#1abc9c' },
  { name: 'Prepotente',     emoji: '🎭',  color: '#f39c12' },
];

// --- Session builder ---
let sessionIdx = 0;

function buildSession({ gameDef, gameId, date, participants, winnerName, forcedRatings = {}, coopOutcome = null, explicitScores = null, forceMode = null }) {
  const id = `seed-${String(++sessionIdx).padStart(3, '0')}`;
  const isCoop = gameDef.cooperative;
  const variance = Math.round(gameDef.play_time * 0.3);
  const duration = Math.max((gameDef.play_time + ri(-variance, variance)) * 60, 900);

  // Consume one RNG call for mode even when forceMode is set, to keep the sequence stable
  const modeRoll = rng();
  const mode = forceMode || (isCoop ? 'winlose' : (modeRoll < 0.8 ? 'points' : 'winlose'));
  const outcome = isCoop ? (coopOutcome || (rng() < 0.55 ? 'win' : 'lose')) : null;

  let scores = explicitScores ? [...explicitScores] : null;
  if (!scores && mode === 'points') {
    scores = participants.map(() => ri(1, 50));
    if (winnerName) {
      const winIdx = participants.findIndex(p => p.name === winnerName);
      if (winIdx >= 0) {
        const maxOther = Math.max(0, ...scores.filter((_, i) => i !== winIdx));
        scores[winIdx] = maxOther + ri(1, 10);
      }
    }
  }

  const winnerSet = new Set();
  if (!isCoop) {
    if (mode === 'points' && scores) {
      const max = Math.max(...scores);
      participants.forEach((p, i) => { if (scores[i] === max) winnerSet.add(p.name); });
    } else {
      winnerSet.add(winnerName || pick(participants).name);
    }
  }

  const players = participants.map((p, i) => ({
    player_id: String(p.id),
    player_name: p.name,
    score: scores ? scores[i] : null,
    winner: winnerSet.has(p.name),
    feedback_rating: (p.name in forcedRatings)
      ? forcedRatings[p.name]
      : (rng() < 0.7 ? ri(5, 9) : null),
  }));

  return { id, game_name: gameDef.name, game_id: gameId, played_at: date, duration_seconds: duration, mode, outcome, players };
}

async function main() {
  // --- RESET ---
  console.log('Resetting data...');
  await pool.query('DELETE FROM session_players');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM active_sessions');
  await pool.query('DELETE FROM settings');
  await pool.query('DELETE FROM games');
  await pool.query('DELETE FROM players');
  await pool.query('DELETE FROM users WHERE email != $1 AND email != $2', [adminEmail, testUserEmail]);

  // --- TEST USER ---
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [testUserEmail]);
  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
  } else {
    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO users (google_id, email, display_name, approved, role, ai_enabled, ai_daily_limit)
       VALUES ($1, $2, 'Test User', TRUE, 'user', TRUE, 20) RETURNING id`,
      ['seed-test-user-001', testUserEmail]
    );
    userId = id;
  }

  // --- PLAYERS ---
  const players = [];
  for (const def of PLAYER_DEFS) {
    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO players (user_id, name, emoji, color) VALUES ($1,$2,$3,$4) RETURNING id`,
      [userId, def.name, def.emoji, def.color]
    );
    players.push({ ...def, id });
  }
  const P        = Object.fromEntries(players.map(p => [p.name, p]));
  const carl     = P['Carl'];
  const donut    = P['Princess Donut'];
  const mordecai = P['Mordecai'];
  const bautista = P['Bautista'];
  const katia    = P['Katia'];
  const prep     = P['Prepotente'];
  const noPrep   = players.filter(p => p.name !== 'Prepotente');

  // --- GAMES ---
  const gameMap = {};
  for (const def of GAME_DEFS) {
    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO games (user_id, name, type, complexity, min_players, max_players, play_time, bgg_id, cooperative, played, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,'manual') RETURNING id`,
      [userId, def.name, def.type, def.complexity, def.min_players, def.max_players, def.play_time, def.bgg_id, def.cooperative]
    );
    gameMap[def.name] = { def, id };
  }
  const G = name => gameMap[name];

  const sessions = [];

  // --- Pattern 1: Carl's Small World dominance ---
  // 8 sessions in last 3 months. Carl wins 7, Mordecai always second.
  const sw = G('Small World');
  for (let i = 0; i < 8; i++) {
    const carlWins = i < 7;
    const extra = pickN(noPrep.filter(p => p !== carl && p !== mordecai), ri(0, 2));
    const participants = [carl, mordecai, ...extra];
    const base = ri(20, 30);
    const explicitScores = participants.map(p => {
      if (p === carl)     return Math.max(1, carlWins ? base + ri(8, 15) : base + ri(1, 3));
      if (p === mordecai) return Math.max(1, carlWins ? base + ri(1, 3)  : base + ri(8, 15));
      return Math.max(1, base - ri(2, 8));
    });
    sessions.push(buildSession({
      gameDef: sw.def, gameId: sw.id,
      date: dateAgo(ri(3, 90)),
      participants, explicitScores,
      winnerName: carlWins ? carl.name : mordecai.name,
      forceMode: 'points',
    }));
  }

  // --- Pattern 2: Princess Donut hates Catan ---
  // 6 sessions. PD always plays, rates 2-3. Everyone else rates 6-8.
  const catan = G('Catan');
  for (let i = 0; i < 6; i++) {
    const others = pickN([carl, mordecai, bautista, katia], ri(2, 3));
    const participants = [donut, ...others];
    const forcedRatings = { 'Princess Donut': ri(2, 3) };
    others.forEach(p => { forcedRatings[p.name] = ri(6, 8); });
    sessions.push(buildSession({
      gameDef: catan.def, gameId: catan.id,
      date: randomDate(180),
      participants,
      winnerName: pick(others).name,
      forcedRatings,
      forceMode: 'points',
    }));
  }

  // --- Pattern 3: The forgotten gem - Everdell ---
  // 3 sessions ~5 months ago, rated 8-9 by everyone, never played again.
  const everdell = G('Everdell');
  for (let i = 0; i < 3; i++) {
    const participants = pickN(noPrep, ri(2, 4));
    const forcedRatings = {};
    participants.forEach(p => { forcedRatings[p.name] = ri(8, 9); });
    sessions.push(buildSession({
      gameDef: everdell.def, gameId: everdell.id,
      date: dateAgo(ri(140, 165)),
      participants, forcedRatings,
      forceMode: 'points',
    }));
  }

  // --- Pattern 4: Katia's cooperative streak ---
  // All coop sessions include Katia. She rates 8-10.
  for (const [gameName, count] of [['Pandemic', 3], ['Spirit Island', 3], ['Arkham Horror', 2]]) {
    const g = G(gameName);
    for (let i = 0; i < count; i++) {
      const maxOthers = Math.min(g.def.max_players, 4) - 1;
      const others = pickN(noPrep.filter(p => p !== katia), ri(1, maxOthers));
      const participants = [katia, ...others];
      const forcedRatings = { 'Katia': ri(8, 10) };
      sessions.push(buildSession({
        gameDef: g.def, gameId: g.id,
        date: randomDate(180),
        participants, forcedRatings,
        coopOutcome: rng() < 0.55 ? 'win' : 'lose',
      }));
    }
  }

  // --- Pattern 5: Prepotente's suspicious win rate ---
  // Appears in exactly 5 sessions, wins 4.
  const prepGames = ['Splendor', 'Dominion', '7 Wonders', 'Root', 'Dead of Winter'];
  for (let i = 0; i < 5; i++) {
    const g = G(prepGames[i]);
    const others = pickN(noPrep, ri(2, 3));
    const participants = [prep, ...others];
    sessions.push(buildSession({
      gameDef: g.def, gameId: g.id,
      date: randomDate(180),
      participants,
      winnerName: i < 4 ? prep.name : pick(others).name,
      forceMode: 'points',
    }));
  }

  // --- Pattern 6: Recent hot streak ---
  // Last 2 weeks: 3 Wingspan + 3 Azul.
  for (const gameName of ['Wingspan', 'Wingspan', 'Wingspan', 'Azul', 'Azul', 'Azul']) {
    const g = G(gameName);
    const participants = pickN(noPrep, ri(2, 4));
    sessions.push(buildSession({
      gameDef: g.def, gameId: g.id,
      date: dateAgo(ri(0, 14)),
      participants,
    }));
  }

  // --- Pattern 7: Ticket to Ride rivalry ---
  // 6 sessions. Carl and Mordecai alternate wins with near-identical scores.
  const ttr = G('Ticket to Ride');
  for (let i = 0; i < 6; i++) {
    const carlWins = i % 2 === 0;
    const extra = pickN([bautista, katia, donut], ri(0, 2));
    const participants = [carl, mordecai, ...extra];
    const winnerScore = ri(35, 48);
    const loserScore = winnerScore - ri(1, 3);
    const explicitScores = participants.map(p => {
      if (p === carl)     return carlWins ? winnerScore : loserScore;
      if (p === mordecai) return carlWins ? loserScore  : winnerScore;
      return ri(5, Math.max(6, loserScore - 5));
    });
    sessions.push(buildSession({
      gameDef: ttr.def, gameId: ttr.id,
      date: randomDate(180),
      participants, explicitScores,
      winnerName: carlWins ? carl.name : mordecai.name,
      forceMode: 'points',
    }));
  }

  // --- Random fill to reach 67 total ---
  // Never include Prepotente. Exclude Everdell (forgotten gem) and coop games
  // (Katia must be in all coop). Exclude Catan (PD pattern covers all Catan sessions).
  const FILL_EXCLUDE = new Set(['Pandemic', 'Spirit Island', 'Arkham Horror', 'Everdell', 'Catan']);
  const fillGames = GAME_DEFS.filter(g => !FILL_EXCLUDE.has(g.name)).map(g => g.name);

  while (sessions.length < 67) {
    const g = G(pick(fillGames));
    const maxP = Math.min(g.def.max_players, noPrep.length);
    const count = ri(2, Math.max(2, maxP));
    const participants = pickN(noPrep, count);
    sessions.push(buildSession({
      gameDef: g.def, gameId: g.id,
      date: randomDate(180),
      participants,
    }));
  }

  // --- Insert sessions ---
  let spCount = 0;
  for (const s of sessions) {
    await pool.query(
      `INSERT INTO sessions (id, user_id, game_name, game_id, played_at, duration_seconds, mode, outcome, low_score_wins)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)`,
      [s.id, userId, s.game_name, s.game_id, s.played_at, s.duration_seconds, s.mode, s.outcome]
    );
    for (const sp of s.players) {
      await pool.query(
        `INSERT INTO session_players (session_id, player_id, player_name, score, winner, feedback_rating)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.id, sp.player_id, sp.player_name, sp.score, sp.winner, sp.feedback_rating]
      );
      spCount++;
    }
  }

  // --- Active session: Root, Carl 12 / Mordecai 8 / Bautista 15, timer at 47 min ---
  const rootGame = G('Root');
  await pool.query(
    `INSERT INTO active_sessions (id, user_id, data, paused_at) VALUES ($1,$2,$3,NOW())`,
    [
      'seed-active-001',
      userId,
      JSON.stringify({
        id: 'seed-active-001',
        gameName: 'Root',
        gameId: rootGame.id,
        players: [
          { id: String(carl.id),     name: 'Carl',     emoji: '⚔️',  color: '#e74c3c', score: 12 },
          { id: String(mordecai.id), name: 'Mordecai', emoji: '🎩',  color: '#2c3e50', score: 8  },
          { id: String(bautista.id), name: 'Bautista', emoji: '💪',  color: '#e67e22', score: 15 },
        ],
        mode: 'points',
        lowScoreWins: false,
        timerSeconds: 2820,
        timerRunning: false,
        pausedAt: new Date().toISOString(),
      }),
    ]
  );

  const patternCount = 8 + 6 + 3 + 8 + 5 + 6 + 6;
  const randomCount = sessions.length - patternCount;
  console.log('Seed complete:');
  console.log(`- 1 test user`);
  console.log(`- ${players.length} players`);
  console.log(`- ${GAME_DEFS.length} games`);
  console.log(`- ${sessions.length} sessions (~${randomCount} random + ${patternCount} pattern)`);
  console.log(`- 1 active session`);
  console.log(`- ${spCount} session_player rows`);

  await pool.end();
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  pool.end();
  process.exit(1);
});
