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
    const playlist = playlists[0];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      embedUrl: `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`,
      name: playlist.name,
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

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "POST" && req.url === "/api/why") {
    handleWhy(req, res);
  } else if (req.method === "GET" && req.url.startsWith("/api/spotify/playlist")) {
    handleSpotifyPlaylist(req, res);
  } else {
    serveStatic(req, res);
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Game Night Planner running at http://localhost:${PORT}`);
});
