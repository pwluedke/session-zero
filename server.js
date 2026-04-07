require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

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

async function handleSpotifyPlaylist(req, res) {
  const url = new URL(req.url, "http://localhost");
  const game = url.searchParams.get("game") || "";
  const type = url.searchParams.get("type") || "";
  const customQuery = url.searchParams.get("query") || "";
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
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No playlist found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      playlists: playlists.slice(0, 5).map(p => ({
        embedUrl: `https://open.spotify.com/embed/playlist/${p.id}?utm_source=generator&theme=0`,
        name: p.name,
      })),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
};

async function handleWhy(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { game, filters } = JSON.parse(body);

      const playerInfo = filters.players ? `${filters.players} players` : "any group size";
      const timeInfo = filters.playtime ? `under ${filters.playtime} minutes` : "any duration";
      const complexityInfo = filters.complexity ? `${filters.complexity} complexity` : "any complexity";
      const typeInfo = filters.type ? `${filters.type} game` : null;
      const ageInfo = filters.age ? `ages ${filters.age} and under` : null;
      const newInfo = filters.newOnly ? "the group hasn't played this before" : null;

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
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ explanation: text }));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function serveStatic(req, res) {
  const filePath = path.join(
    __dirname,
    req.url === "/" ? "index.html" : req.url
  );
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(data);
  });
}

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

async function handleBGGCollection(req, res) {
  const url = new URL(req.url, "http://localhost");
  const username = url.searchParams.get("username")?.trim();
  if (!username) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "username required" }));
    return;
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
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Could not reach BoardGameGeek" }));
      return;
    }
    if (bggRes.status === 202) continue; // BGG is building the response
    if (bggRes.status === 401) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "BGG API token missing or invalid. Add BGG_API_TOKEN to your .env file." }));
      return;
    }
    if (bggRes.status === 404) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `BGG user "${username}" not found` }));
      return;
    }
    if (!bggRes.ok) {
      res.writeHead(bggRes.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `BGG returned ${bggRes.status}` }));
      return;
    }
    xml = await bggRes.text();
    break;
  }

  if (!xml) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "BGG is still building your collection. Wait a moment and try again.",
      retry: true,
    }));
    return;
  }

  const games = parseBGGXml(xml);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ games, count: games.length }));
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "POST" && req.url === "/api/why") {
    handleWhy(req, res);
  } else if (req.method === "GET" && req.url.startsWith("/api/spotify/playlist")) {
    handleSpotifyPlaylist(req, res);
  } else if (req.method === "GET" && req.url.startsWith("/api/bgg/collection")) {
    handleBGGCollection(req, res);
  } else {
    serveStatic(req, res);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game Night Planner running at http://localhost:${PORT}`);
});
