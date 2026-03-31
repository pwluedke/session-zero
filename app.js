let games = [];
let newOnly = false;
let coopOnly = false;

fetch("games.json")
  .then(res => res.json())
  .then(data => { games = data; })
  .catch(() => console.error("Could not load games.json"));

function toggleNewOnly() {
  newOnly = !newOnly;
  const btn = document.getElementById("new-only-btn");
  btn.textContent = newOnly ? "On" : "Off";
  btn.setAttribute("aria-pressed", newOnly);
  btn.classList.toggle("toggle-on", newOnly);
}

function toggleCoop() {
  coopOnly = !coopOnly;
  const btn = document.getElementById("coop-btn");
  btn.textContent = coopOnly ? "On" : "Off";
  btn.setAttribute("aria-pressed", coopOnly);
  btn.classList.toggle("toggle-on", coopOnly);
}

function getFilters() {
  return {
    players:    parseInt(document.getElementById("players").value) || null,
    playtime:   parseInt(document.getElementById("playtime").value) || null,
    complexity: document.getElementById("complexity").value || null,
    type:       document.getElementById("type").value || null,
    age:        parseInt(document.getElementById("age").value) || null,
    setup:      parseInt(document.getElementById("setup").value) || null,
    minRating:  parseInt(document.getElementById("min-rating").value) || null,
    newOnly,
    coopOnly,
  };
}

function filterGames({ players, playtime, complexity, type, age, setup, minRating, newOnly, coopOnly }) {
  return games.filter(game => {
    if (players && (players < game.minPlayers || players > game.maxPlayers)) return false;
    if (playtime && game.playTime > playtime) return false;
    if (complexity && game.complexity !== complexity) return false;
    if (type && game.type !== type) return false;
    if (age && game.age > age) return false;
    if (setup && game.setupTime > setup) return false;
    if (minRating && (game.rating === null || game.rating < minRating)) return false;
    if (newOnly && game.played) return false;
    if (coopOnly && !game.cooperative) return false;
    return true;
  });
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function formatPlayTime(minutes) {
  if (minutes >= 999) return "Variable";
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${minutes} min`;
}

function renderResults(picked, heading) {
  const resultsSection = document.getElementById("results");
  const noResults = document.getElementById("no-results");
  const gameList = document.getElementById("game-list");
  const resultsHeading = document.getElementById("results-heading");

  gameList.innerHTML = "";

  if (picked.length === 0) {
    resultsSection.classList.add("hidden");
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  resultsHeading.textContent = heading;

  const filters = getFilters();

  picked.forEach(game => {
    const badgeClass = `badge-${game.complexity.toLowerCase()}`;
    const players = game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} player${game.minPlayers > 1 ? "s" : ""}`
      : `${game.minPlayers}–${game.maxPlayers} players`;

    const ratingHtml = game.rating
      ? `<span class="game-rating">${"★".repeat(game.rating)}${"☆".repeat(5 - game.rating)}</span>`
      : "";

    const li = document.createElement("li");
    li.className = "game-card";
    li.innerHTML = `
      <div class="game-card-main">
        <div>
          <div class="game-name">${game.name}</div>
          <div class="game-meta">
            <span>👥 ${players}</span>
            <span>⏱ ${formatPlayTime(game.playTime)}</span>
            <span>🔧 ${game.setupTime} min setup</span>
            <span class="type-tag">${game.type}</span>
            ${game.cooperative ? `<span class="coop-tag">Co-op</span>` : ""}
          </div>
        </div>
        <div class="game-card-right">
          ${ratingHtml}
          <span class="badge ${badgeClass}">${game.complexity}</span>
          <button class="why-btn" onclick="askWhy(this, ${JSON.stringify(game).replace(/"/g, '&quot;')}, ${JSON.stringify(filters).replace(/"/g, '&quot;')})">Why?</button>
        </div>
      </div>
      <div class="why-text hidden"></div>
    `;
    gameList.appendChild(li);
  });
}

async function askWhy(btn, game, filters) {
  const card = btn.closest(".game-card");
  const whyText = card.querySelector(".why-text");

  btn.disabled = true;
  btn.textContent = "...";
  whyText.classList.remove("hidden");
  whyText.textContent = "Thinking...";

  try {
    const res = await fetch("/api/why", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, filters }),
    });
    const data = await res.json();
    whyText.textContent = data.explanation || data.error || "No response.";
  } catch {
    whyText.textContent = "Could not reach the server.";
  }

  btn.disabled = false;
  btn.textContent = "Why?";
}

function suggest() {
  const filters = getFilters();
  const matches = filterGames(filters);
  const picked = pickRandom(matches, Math.min(5, matches.length));
  renderResults(picked, `${picked.length} Game${picked.length !== 1 ? "s" : ""} for Tonight`);
}

function surprise() {
  if (games.length === 0) return;
  const pick = pickRandom(games, 1);
  renderResults(pick, "🎲 Tonight's Pick");
}
