const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
