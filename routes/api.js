const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const pool = require("../db/index");

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Me ─────────────────────────────────────────────────────────────────────
router.get("/api/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const { display_name, email, avatar_url } = req.user;
  res.json({ display_name, email, avatar_url });
});

// ── Players ────────────────────────────────────────────────────────────────
router.get("/api/players", async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const { rows } = await pool.query(
      "SELECT id, name, emoji, color, last_played FROM players WHERE user_id = $1 ORDER BY name",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/players", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const { name, emoji, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO players (user_id, name, emoji, color) VALUES ($1, $2, $3, $4) RETURNING id, name, emoji, color, last_played",
      [req.user.id, name.trim(), emoji ?? null, color ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/players/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const updates = [];
  const vals = [];
  let idx = 1;
  if ("emoji" in req.body)       { updates.push(`emoji = $${idx++}`);       vals.push(req.body.emoji); }
  if ("color" in req.body)       { updates.push(`color = $${idx++}`);       vals.push(req.body.color); }
  if ("last_played" in req.body) { updates.push(`last_played = $${idx++}`); vals.push(req.body.last_played); }
  if (!updates.length) return res.status(400).json({ error: "Nothing to update" });
  vals.push(req.params.id, req.user.id);
  try {
    const { rows } = await pool.query(
      `UPDATE players SET ${updates.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING id, name, emoji, color, last_played`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: "Player not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/players/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    await pool.query(
      "DELETE FROM players WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Settings ───────────────────────────────────────────────────────────────
function normalizeSettings(row) {
  return {
    showWhyBtn:       row.show_why_btn,
    bggUsername:      row.bgg_username,
    bggLastSync:      row.bgg_last_sync,
    bggLastSyncCount: row.bgg_last_sync_count,
  };
}

router.get("/api/settings", async (req, res) => {
  if (!pool) return res.json(normalizeSettings({ show_why_btn: true, bgg_username: null, bgg_last_sync: null, bgg_last_sync_count: null }));
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [req.user.id]
    );
    res.json(normalizeSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/settings", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    const { showWhyBtn, bggUsername, bggLastSync, bggLastSyncCount } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO settings (user_id, show_why_btn, bgg_username, bgg_last_sync, bgg_last_sync_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         show_why_btn        = EXCLUDED.show_why_btn,
         bgg_username        = EXCLUDED.bgg_username,
         bgg_last_sync       = EXCLUDED.bgg_last_sync,
         bgg_last_sync_count = EXCLUDED.bgg_last_sync_count
       RETURNING *`,
      [req.user.id, showWhyBtn ?? true, bggUsername ?? null, bggLastSync ?? null, bggLastSyncCount ?? null]
    );
    res.json(normalizeSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Games ──────────────────────────────────────────────────────────────────
function normalizeGame(row) {
  return {
    id:                  row.id,
    name:                row.name,
    type:                row.type,
    complexity:          row.complexity,
    minPlayers:          row.min_players,
    maxPlayers:          row.max_players,
    playTime:            row.play_time,
    age:                 row.age,
    setupTime:           row.setup_time,
    rating:              row.rating,
    played:              row.played,
    cooperative:         row.cooperative,
    thumbnail:           row.thumbnail,
    bggId:               row.bgg_id,
    source:              row.source,
    spotifyEmbedUrl:     row.spotify_embed_url,
    spotifyPlaylistName: row.spotify_playlist_name,
  };
}

const GAME_INSERT_COLS = `(user_id, name, type, complexity, min_players, max_players,
  play_time, age, setup_time, rating, played, cooperative, thumbnail, bgg_id, source,
  spotify_embed_url, spotify_playlist_name)`;
const GAME_INSERT_VALS = `($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`;
function gameParams(userId, g) {
  return [userId, g.name, g.type ?? 'Board', g.complexity ?? 'Medium',
    g.minPlayers ?? 1, g.maxPlayers ?? 1, g.playTime ?? 60,
    g.age ?? 0, g.setupTime ?? 10, g.rating ?? null,
    g.played ?? false, g.cooperative ?? false, g.thumbnail ?? null,
    g.bggId ?? null, g.source ?? 'manual',
    g.spotifyEmbedUrl ?? null, g.spotifyPlaylistName ?? null];
}

router.get("/api/games", async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const { rows } = await pool.query(
      "SELECT * FROM games WHERE user_id = $1 ORDER BY name",
      [req.user.id]
    );
    res.json(rows.map(normalizeGame));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/games/sync", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    const arr = req.body;
    if (!Array.isArray(arr)) return res.status(400).json({ error: "Expected array" });
    await pool.query("DELETE FROM games WHERE user_id = $1", [req.user.id]);
    const result = [];
    for (const g of arr) {
      const { rows } = await pool.query(
        `INSERT INTO games ${GAME_INSERT_COLS} VALUES ${GAME_INSERT_VALS} RETURNING *`,
        gameParams(req.user.id, g)
      );
      result.push(rows[0]);
    }
    res.json(result.map(normalizeGame));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/games", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO games ${GAME_INSERT_COLS} VALUES ${GAME_INSERT_VALS} RETURNING *`,
      gameParams(req.user.id, req.body)
    );
    res.status(201).json(normalizeGame(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/games/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    const fieldMap = {
      name: 'name', type: 'type', complexity: 'complexity',
      minPlayers: 'min_players', maxPlayers: 'max_players', playTime: 'play_time',
      age: 'age', setupTime: 'setup_time', rating: 'rating', played: 'played',
      cooperative: 'cooperative', thumbnail: 'thumbnail', bggId: 'bgg_id',
      source: 'source', spotifyEmbedUrl: 'spotify_embed_url',
      spotifyPlaylistName: 'spotify_playlist_name',
    };
    const sets = [];
    const vals = [req.params.id, req.user.id];
    let i = 3;
    for (const [jsKey, col] of Object.entries(fieldMap)) {
      if (jsKey in req.body) { sets.push(`${col} = $${i++}`); vals.push(req.body[jsKey]); }
    }
    if (!sets.length) return res.status(400).json({ error: "No fields to update" });
    const { rows } = await pool.query(
      `UPDATE games SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(normalizeGame(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/games/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    await pool.query("DELETE FROM games WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]);
    res.json({});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Spotify ────────────────────────────────────────────────────────────────
let spotifyToken = null;
let spotifyTokenExpiry = 0;

const TYPE_PLAYLIST_QUERIES = {
  Party:     "fun party game night playlist",
  Board:     "board game night music instrumental",
  Card:      "card game night music",
  Abstract:  "focus instrumental concentration music",
  Mystery:   "mystery atmospheric suspense music",
  Narrative: "storytelling ambient cinematic music",
  Dice:      "tabletop rpg game music",
};

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

async function searchPlaylist(token, query) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.playlists?.items?.filter(Boolean) ?? [];
}

// ── Why? ───────────────────────────────────────────────────────────────────
const DEMO_WHY_RESPONSE = "This is a great pick for tonight! The mix of strategy and luck keeps everyone engaged, and it plays well with groups of different experience levels. Give it a try -- demo mode is showing you a sample response instead of calling the AI.";

router.post("/api/why", async (req, res) => {
  if (req.body.demo === true) {
    return res.json({ explanation: DEMO_WHY_RESPONSE });
  }

  try {
    const { game, filters } = req.body;

    const playerInfo     = filters.players    ? `${filters.players} players`          : "any group size";
    const timeInfo       = filters.playtime   ? `under ${filters.playtime} minutes`   : "any duration";
    const complexityInfo = filters.complexity ? `${filters.complexity} complexity`    : "any complexity";
    const typeInfo       = filters.type       ? `${filters.type} game`                : null;
    const ageInfo        = filters.age        ? `ages ${filters.age} and under`       : null;
    const newInfo        = filters.newOnly    ? "the group hasn't played this before" : null;

    const groupContext = [playerInfo, timeInfo, complexityInfo, typeInfo, ageInfo, newInfo]
      .filter(Boolean).join(", ");

    const prompt = `You are a board game recommender. Explain in 2-3 sentences why "${game.name}" is a great pick for tonight's game night.

Game details:
- Type: ${game.type}
- Players: ${game.minPlayers}–${game.maxPlayers}
- Play time: ~${game.playTime === 999 ? "variable" : game.playTime + " minutes"}
- Complexity: ${game.complexity}
- Min age: ${game.age}+
- Previously played: ${game.played ? "yes" : "no"}

Tonight's group: ${groupContext}

Be enthusiastic and specific. Mention one standout feature of the game. If it's new to the group, note that it's a fresh experience.`;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ explanation: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Spotify ────────────────────────────────────────────────────────────────
router.get("/api/spotify/playlist", async (req, res) => {
  const game        = req.query.game        || "";
  const type        = req.query.type        || "";
  const customQuery = req.query.query       || "";
  try {
    const token = await getSpotifyToken();
    let playlists;
    if (customQuery) {
      playlists = await searchPlaylist(token, customQuery);
    } else {
      playlists = await searchPlaylist(token, `${game} board game music`);
      if (playlists.length === 0) {
        const fallback = TYPE_PLAYLIST_QUERIES[type] || "board game night music";
        playlists = await searchPlaylist(token, fallback);
      }
    }
    if (playlists.length === 0) {
      return res.status(404).json({ error: "No playlist found" });
    }
    res.json({
      playlists: playlists.slice(0, 5).map(p => ({
        embedUrl: `https://open.spotify.com/embed/playlist/${p.id}?utm_source=generator&theme=0`,
        name: p.name,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── BGG Collection Sync ────────────────────────────────────────────────────
function parseBGGXml(xml) {
  const games = [];
  const parts = xml.split("<item ");

  for (let i = 1; i < parts.length; i++) {
    const block = "<item " + parts[i];

    const idMatch = block.match(/objectid="(\d+)"/);
    if (!idMatch) continue;
    const bggId = parseInt(idMatch[1]);

    const subtypeMatch = block.match(/subtype="([^"]*)"/);
    if (subtypeMatch && subtypeMatch[1] === "boardgameexpansion") continue;

    const nameMatch = block.match(/<name[^>]*>([^<]*)<\/name>/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const thumbMatch = block.match(/<thumbnail>\s*([^<\s]+)\s*<\/thumbnail>/);
    const thumbnail = thumbMatch
      ? thumbMatch[1].trim().replace(/^\/\//, "https://")
      : null;

    const statsMatch = block.match(/<stats\s([^>]*)>/);
    let minPlayers = 1, maxPlayers = 4, minPlaytime = 0, maxPlaytime = 0;
    if (statsMatch) {
      const sa = statsMatch[1];
      minPlayers  = parseInt(sa.match(/minplayers="(\d+)"/)?.[1])  || 1;
      maxPlayers  = parseInt(sa.match(/maxplayers="(\d+)"/)?.[1])  || minPlayers;
      minPlaytime = parseInt(sa.match(/minplaytime="(\d+)"/)?.[1]) || 0;
      maxPlaytime = parseInt(sa.match(/maxplaytime="(\d+)"/)?.[1]) || 0;
    }

    const avgMatch = block.match(/<average\s+value="([^"]*)"/);
    let rating = null;
    if (avgMatch && avgMatch[1] !== "N/A") {
      const raw = parseFloat(avgMatch[1]);
      if (!isNaN(raw) && raw > 0) {
        rating = Math.min(5, Math.max(1, Math.round(raw / 2)));
      }
    }

    const playsMatch = block.match(/<numplays>(\d+)<\/numplays>/);
    const played = playsMatch ? parseInt(playsMatch[1]) > 0 : false;

    const playTime = maxPlaytime || minPlaytime || 60;

    games.push({
      name,
      minPlayers,
      maxPlayers,
      playTime: playTime >= 999 ? 999 : playTime,
      complexity: "Medium",
      type: "Board",
      age: 0,
      setupTime: 10,
      rating,
      played,
      cooperative: false,
      thumbnail,
      bggId,
    });
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

router.get("/api/bgg/collection", async (req, res) => {
  const username = req.query.username?.trim();
  if (!username) {
    return res.status(400).json({ error: "username required" });
  }

  const bggUrl =
    `https://boardgamegeek.com/xmlapi2/collection` +
    `?username=${encodeURIComponent(username)}&own=1` +
    `&excludesubtype=boardgameexpansion&stats=1`;

  const bggToken = process.env.BGG_API_TOKEN;
  const headers = bggToken ? { Authorization: `Bearer ${bggToken}` } : {};

  let xml = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
    let bggRes;
    try {
      bggRes = await fetch(bggUrl, { headers });
    } catch (err) {
      console.error("[BGG] Network error reaching BGG:", err.message);
      return res.status(502).json({ error: "Could not reach BoardGameGeek" });
    }
    console.log(`[BGG] attempt ${attempt + 1}: HTTP ${bggRes.status} for user "${username}"`);
    if (bggRes.status === 202) continue;
    if (bggRes.status === 401) {
      return res.status(401).json({ error: "BGG API token missing or invalid. Add BGG_API_TOKEN to your .env file." });
    }
    if (bggRes.status === 404) {
      return res.status(404).json({ error: `BGG user "${username}" not found` });
    }
    if (!bggRes.ok) {
      return res.status(bggRes.status).json({ error: `BGG returned ${bggRes.status}` });
    }
    xml = await bggRes.text();
    break;
  }

  if (!xml) {
    return res.status(503).json({
      error: "BGG is still building your collection. Wait a moment and try again.",
      retry: true,
    });
  }

  const games = parseBGGXml(xml);
  res.json({ games, count: games.length });
});

module.exports = router;
