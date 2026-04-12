// ── State ──────────────────────────────────────────────────────────────────
let games = [];
let newOnly = false;
let coopOnly = false;
let renderedGames = [];

// Player Vault (permanent registry)
const AVATAR_COLORS = ['#e05252','#f5a842','#5dd67a','#52a8e0','#c275e0','#e91e8c','#f5c842'];
const AVATAR_EMOJIS = ['🎮','🎲','🃏','🧩','♟️','🎯','🎪','🦁','🐉','🦊','🐺','🦝','🎭','🤖','👾','🧙','🧝','🧛','🎩','⚔️','🏴‍☠️','🐸','🐧','🦄'];
let vault = JSON.parse(localStorage.getItem('sz-vault') || '[]');
let emojiPickerTarget = null; // vault player id

// Roll Call (who's playing tonight — session state)
let rollCall = new Set();

// Session
let sessionGame = null;
let sessionPlayers = [];
let timerInterval = null;
let timerSeconds = 0;
let scoreMode = 'points'; // 'points' | 'winlose'
let sessionScores = {};   // { playerId: number }
let sessionOutcome = null; // 'win' | 'loss' (winlose mode only)
let currentSessionId = null;

// Feedback
let feedbackByPlayer = {};     // { [playerId]: { rating, playAgain, notes } }
let activeFeedbackPlayer = null;

// Spotify
let currentSpotifyData = null;    // { embedUrl, name } — the playlist currently showing
let currentSpotifyOptions = [];   // full list returned by last fetch

// Settings
const SETTINGS_DEFAULTS = { showWhyBtn: true };
let settings = { ...SETTINGS_DEFAULTS, ...JSON.parse(localStorage.getItem('sz-settings') || '{}') };

// ── Init ───────────────────────────────────────────────────────────────────
const storedGames = localStorage.getItem('sz-games');
if (storedGames) {
  games = JSON.parse(storedGames);
} else {
  fetch("games.json")
    .then(res => res.json())
    .then(data => { games = data; })
    .catch(() => console.error("Could not load games.json"));
}

renderRollCall();
renderGamesInProgress();
applySettings();

// ── Player Vault ───────────────────────────────────────────────────────────
function openVault() {
  renderVaultList();
  document.getElementById('vault-modal').classList.add('active');
  document.getElementById('vault-name-input').focus();
}

function closeVault() {
  document.getElementById('vault-modal').classList.remove('active');
}

function addToVault() {
  const input = document.getElementById('vault-name-input');
  const name = input.value.trim();
  if (!name) return;
  if (vault.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    input.classList.add('input-error');
    input.select();
    setTimeout(() => input.classList.remove('input-error'), 1200);
    return;
  }
  const color = AVATAR_COLORS[vault.length % AVATAR_COLORS.length];
  vault.push({ id: Date.now().toString(), name, emoji: null, color, lastPlayed: null });
  vault.sort((a, b) => a.name.localeCompare(b.name));
  saveVault();
  renderVaultList();
  renderRollCall();
  input.value = '';
  input.focus();
}

function formatLastPlayed(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function removeFromVault(id) {
  vault = vault.filter(p => p.id !== id);
  rollCall.delete(id);
  saveVault();
  renderVaultList();
  renderRollCall();
  syncPlayersFilter();
}

function saveVault() {
  localStorage.setItem('sz-vault', JSON.stringify(vault));
}

function renderVaultList() {
  const container = document.getElementById('vault-list');
  if (!container) return;
  if (vault.length === 0) {
    container.innerHTML = '<p class="no-players-msg">No players yet — add your game group above.</p>';
    return;
  }
  const sorted = [...vault].sort((a, b) => a.name.localeCompare(b.name));
  container.innerHTML = `
    <div class="vault-header-row">
      <span></span>
      <span class="vault-col-player">Player</span>
      <span class="vault-col-label">Last at the Table</span>
      <span></span>
    </div>
    ${sorted.map(p => `
      <div class="vault-row" data-testid="vault-player" data-player-id="${p.id}">
        ${avatarHtml(p, true)}
        <span class="vault-col-player">${p.name}</span>
        <span class="vault-col-date">${formatLastPlayed(p.lastPlayed)}</span>
        <button class="player-remove" data-testid="vault-remove" onclick="removeFromVault('${p.id}')">×</button>
      </div>
    `).join('')}
  `;
}

// ── Roll Call ──────────────────────────────────────────────────────────────
function toggleRollCall(id) {
  if (rollCall.has(id)) {
    rollCall.delete(id);
  } else {
    rollCall.add(id);
  }
  renderRollCall();
  syncPlayersFilter();
}

function renderRollCall() {
  const container = document.getElementById('roll-call-chips');
  if (!container) return;
  if (vault.length === 0) {
    container.innerHTML = '<p class="no-players-msg">Open the Player Vault to register your game group.</p>';
    return;
  }
  container.innerHTML = vault.map(p => {
    const active = rollCall.has(p.id);
    return `
      <div class="roll-call-chip ${active ? 'active' : ''}" data-testid="roll-call-chip" data-player-id="${p.id}" onclick="toggleRollCall('${p.id}')">
        ${avatarHtml(p)}
        <span class="player-name">${p.name}</span>
        ${active ? '<span class="check">✓</span>' : ''}
      </div>
    `;
  }).join('');
}

function syncPlayersFilter() {
  document.getElementById('players').value = rollCall.size > 0 ? rollCall.size : '';
}

// ── Avatars ────────────────────────────────────────────────────────────────
function avatarHtml(player, clickable = false) {
  const isEmoji = !!player.emoji;
  const content = isEmoji
    ? player.emoji
    : player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const style = isEmoji ? '' : `style="background:${player.color}"`;
  const clickHandler = clickable ? `onclick="openEmojiPicker('${player.id}')"` : '';
  return `<div class="avatar ${isEmoji ? 'avatar-emoji' : 'avatar-initials'}" ${style} ${clickHandler}>${content}</div>`;
}

// ── Emoji Picker ───────────────────────────────────────────────────────────
function openEmojiPicker(playerId) {
  emojiPickerTarget = playerId;
  const grid = document.getElementById('emoji-grid');
  grid.innerHTML = AVATAR_EMOJIS.map(e =>
    `<button class="emoji-option" onclick="selectPlayerEmoji('${e}')">${e}</button>`
  ).join('');
  document.getElementById('emoji-picker-overlay').classList.add('active');
}

function selectPlayerEmoji(emoji) {
  if (emojiPickerTarget !== null) {
    const player = vault.find(p => p.id === emojiPickerTarget);
    if (player) {
      player.emoji = emoji;
      saveVault();
      renderVaultList();
      renderRollCall();
    }
  }
  closeEmojiPicker();
}

function clearPlayerEmoji() {
  if (emojiPickerTarget !== null) {
    const player = vault.find(p => p.id === emojiPickerTarget);
    if (player) {
      player.emoji = null;
      saveVault();
      renderVaultList();
      renderRollCall();
    }
  }
  closeEmojiPicker();
}

function closeEmojiPicker() {
  emojiPickerTarget = null;
  document.getElementById('emoji-picker-overlay').classList.remove('active');
}

// ── Settings ───────────────────────────────────────────────────────────────
function openSettings() {
  renderSettingsModal();
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
}

function renderSettingsModal() {
  const btn = document.getElementById('setting-why-btn');
  if (btn) {
    btn.textContent = settings.showWhyBtn ? 'On' : 'Off';
    btn.setAttribute('aria-pressed', settings.showWhyBtn);
    btn.classList.toggle('toggle-on', settings.showWhyBtn);
  }

  const usernameInput = document.getElementById('bgg-username-input');
  if (usernameInput && settings.bggUsername) {
    usernameInput.value = settings.bggUsername;
  }

  const statusEl = document.getElementById('bgg-sync-status');
  if (statusEl && settings.bggLastSync) {
    const count = JSON.parse(localStorage.getItem('sz-games') || '[]').length;
    statusEl.textContent = `${count} games synced · ${settings.bggLastSync}`;
    statusEl.className = 'bgg-sync-status bgg-sync-ok';
  }
}

function parseCsvRow(row) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseBGGCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
  const col = name => headers.indexOf(name);

  const iObjectId    = col('objectid');
  const iName        = col('objectname');
  const iSubtype     = col('subtype');
  const iOwn         = col('own');
  const iMinPlayers  = col('minplayers');
  const iMaxPlayers  = col('maxplayers');
  const iMinPlaytime = col('minplaytime');
  const iMaxPlaytime = col('maxplaytime');
  const iAge         = col('minage');
  const iRating      = col('rating');
  const iThumbnail   = col('thumbnail');

  const games = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const f = parseCsvRow(line);

    if (iSubtype >= 0 && f[iSubtype]?.trim() === 'boardgameexpansion') continue;
    if (iOwn >= 0 && f[iOwn]?.trim() !== '1') continue;

    const name = iName >= 0 ? f[iName]?.trim() : '';
    if (!name) continue;

    const minPlayers  = parseInt(f[iMinPlayers])  || 1;
    const maxPlayers  = parseInt(f[iMaxPlayers])  || minPlayers;
    const minPlaytime = parseInt(f[iMinPlaytime]) || 0;
    const maxPlaytime = parseInt(f[iMaxPlaytime]) || 0;
    const playTime    = maxPlaytime || minPlaytime || 60;
    const age         = parseInt(f[iAge]) || 0;
    const thumbnail   = iThumbnail >= 0 ? f[iThumbnail]?.trim() : '';

    const ratingRaw = parseFloat(f[iRating]);
    const rating = !isNaN(ratingRaw) && ratingRaw > 0
      ? Math.min(5, Math.max(1, Math.round(ratingRaw / 2)))
      : null;

    games.push({
      name,
      minPlayers,
      maxPlayers,
      playTime: playTime >= 999 ? 999 : playTime,
      complexity: 'Medium',
      type: 'Board',
      age,
      setupTime: 10,
      rating,
      played: false,
      cooperative: false,
      thumbnail: thumbnail || null,
      bggId: iObjectId >= 0 ? parseInt(f[iObjectId]) : null,
    });
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

function handleBGGImport(input) {
  const statusEl = document.getElementById('bgg-sync-status');
  const file = input.files[0];
  if (!file) return;

  statusEl.textContent = 'Reading file…';
  statusEl.className = 'bgg-sync-status';

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = parseBGGCsv(e.target.result);
      if (imported.length === 0) {
        statusEl.textContent = 'No owned games found. Make sure you exported "owned" games.';
        statusEl.className = 'bgg-sync-status bgg-sync-error';
        return;
      }
      games = imported;
      localStorage.setItem('sz-games', JSON.stringify(games));

      settings.bggLastSync = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: '2-digit',
      });
      localStorage.setItem('sz-settings', JSON.stringify(settings));

      statusEl.textContent = `${imported.length} games imported · ${settings.bggLastSync}`;
      statusEl.className = 'bgg-sync-status bgg-sync-ok';
    } catch (err) {
      statusEl.textContent = 'Failed to parse CSV: ' + err.message;
      statusEl.className = 'bgg-sync-status bgg-sync-error';
    }
    input.value = '';
  };
  reader.onerror = () => {
    statusEl.textContent = 'Could not read file.';
    statusEl.className = 'bgg-sync-status bgg-sync-error';
  };
  reader.readAsText(file);
}

async function syncBGGCollection() {
  const input = document.getElementById('bgg-username-input');
  const statusEl = document.getElementById('bgg-sync-status');
  const btn = document.getElementById('bgg-sync-btn');
  const username = input.value.trim();

  if (!username) {
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 1200);
    return;
  }

  // Save username for next time
  settings.bggUsername = username;
  localStorage.setItem('sz-settings', JSON.stringify(settings));

  btn.disabled = true;
  btn.textContent = 'Syncing…';
  statusEl.textContent = 'Connecting to BoardGameGeek…';
  statusEl.className = 'bgg-sync-status';

  try {
    const res = await fetch(`/api/bgg/collection?username=${encodeURIComponent(username)}`);
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || 'Sync failed.';
      statusEl.className = 'bgg-sync-status bgg-sync-error';
      return;
    }

    if (data.games.length === 0) {
      statusEl.textContent = 'No owned games found on BGG for that username.';
      statusEl.className = 'bgg-sync-status bgg-sync-error';
      return;
    }

    games = data.games;
    localStorage.setItem('sz-games', JSON.stringify(games));

    settings.bggLastSync = new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: '2-digit',
    });
    localStorage.setItem('sz-settings', JSON.stringify(settings));

    statusEl.textContent = `Synced ${data.count} games from BoardGameGeek.`;
    statusEl.className = 'bgg-sync-status bgg-sync-ok';
  } catch (err) {
    console.error('[BGG sync error]', err);
    const msg = err instanceof TypeError
      ? 'Network error — is the server running?'
      : 'Something went wrong. Please try again.';
    statusEl.textContent = msg;
    statusEl.className = 'bgg-sync-status bgg-sync-error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sync';
  }
}

function toggleSetting(key) {
  settings[key] = !settings[key];
  localStorage.setItem('sz-settings', JSON.stringify(settings));
  applySettings();
  renderSettingsModal();
}

function applySettings() {
  document.body.classList.toggle('hide-why', !settings.showWhyBtn);
}

// ── Filters ────────────────────────────────────────────────────────────────
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

// ── Game Cards ─────────────────────────────────────────────────────────────
function renderResults(picked, heading) {
  renderedGames = picked;
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

  picked.forEach((game, index) => {
    const badgeClass = `badge-${game.complexity.toLowerCase()}`;
    const playerCount = game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} player${game.minPlayers > 1 ? "s" : ""}`
      : `${game.minPlayers}–${game.maxPlayers} players`;

    const ratingHtml = game.rating
      ? `<span class="game-rating">${"★".repeat(game.rating)}${"☆".repeat(5 - game.rating)}</span>`
      : "";

    const li = document.createElement("li");
    li.className = "game-card";
    li.setAttribute('data-testid', 'game-card');
    li.innerHTML = `
      <div class="game-card-main">
        <div>
          <div class="game-name" data-testid="game-name">${game.name}</div>
          <div class="game-meta">
            <span>👥 ${playerCount}</span>
            <span>⏱ ${formatPlayTime(game.playTime)}</span>
            <span>🔧 ${game.setupTime} min setup</span>
            <span class="type-tag">${game.type}</span>
            ${game.cooperative ? `<span class="coop-tag">Co-op</span>` : ""}
          </div>
        </div>
        <div class="game-card-right">
          ${ratingHtml}
          <span class="badge ${badgeClass}">${game.complexity}</span>
          <button class="why-btn" data-testid="why-btn" onclick="event.stopPropagation(); askWhy(this, ${JSON.stringify(game).replace(/"/g, '&quot;')}, ${JSON.stringify(filters).replace(/"/g, '&quot;')})">Why?</button>
        </div>
      </div>
      <div class="game-detail hidden">
        <div class="game-detail-meta">
          <span>🎂 Ages ${game.age}+</span>
          ${game.cooperative ? '<span class="coop-tag">🤝 Co-op</span>' : ''}
          <span>${game.played ? '✓ Played before' : '✨ New to us'}</span>
        </div>
        <button class="lets-play-btn" data-testid="lets-play-btn" onclick="event.stopPropagation(); openSession(${index})">Let's Play!</button>
      </div>
      <div class="why-text hidden"></div>
    `;
    li.onclick = () => toggleGameCard(li);
    gameList.appendChild(li);
  });
}

function toggleGameCard(li) {
  const isExpanded = li.classList.contains('expanded');
  document.querySelectorAll('.game-card.expanded').forEach(card => {
    card.classList.remove('expanded');
    card.querySelector('.game-detail').classList.add('hidden');
  });
  if (!isExpanded) {
    li.classList.add('expanded');
    li.querySelector('.game-detail').classList.remove('hidden');
  }
}

// ── Why? ───────────────────────────────────────────────────────────────────
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

// ── Session Modal ──────────────────────────────────────────────────────────
function openSession(index) {
  sessionGame = renderedGames[index];
  sessionPlayers = vault.filter(p => rollCall.has(p.id));
  currentSessionId = Date.now().toString();
  document.getElementById('session-game-title').textContent = sessionGame.name;
  showSessionView();
  renderSessionPlayers();
  initScoreTracker();
  resetTimer();
  resetDiceRoller();
  loadSpotifyPlaylist(sessionGame);
  document.getElementById('session-modal').classList.add('active');
}

async function loadSpotifyPlaylist(game) {
  const container = document.getElementById('spotify-container');
  currentSpotifyData = null;
  currentSpotifyOptions = [];

  // Use saved playlist if available
  if (game.spotifyEmbedUrl) {
    currentSpotifyData = { embedUrl: game.spotifyEmbedUrl, name: game.spotifyPlaylistName || '' };
    renderSpotifyOptions(container, [currentSpotifyData], 0, true);
    return;
  }

  container.innerHTML = '<p class="no-players-msg">Finding music…</p>';
  try {
    const res = await fetch(
      `/api/spotify/playlist?game=${encodeURIComponent(game.name)}&type=${encodeURIComponent(game.type)}`
    );
    const data = await res.json();
    if (data.playlists?.length) {
      renderSpotifyOptions(container, data.playlists, 0, false);
    } else {
      renderSpotifyNoResult(container);
    }
  } catch {
    container.innerHTML = '<p class="no-players-msg">Could not load music.</p>';
  }
}

function renderSpotifyOptions(container, options, selectedIdx, isSaved) {
  currentSpotifyOptions = options;
  currentSpotifyData = options[selectedIdx];

  const optionsHtml = options.length > 1
    ? `<div class="spotify-options">${options.map((opt, i) => {
        const safe = opt.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<button class="spotify-option-btn${i === selectedIdx ? ' active' : ''}"
          onclick="selectSpotifyOption(${i})" title="${safe}">${safe}</button>`;
      }).join('')}</div>`
    : '';

  container.innerHTML = `
    <iframe data-testid="spotify-iframe" id="spotify-iframe"
      src="${options[selectedIdx].embedUrl}"
      width="100%"
      height="152"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy">
    </iframe>
    ${optionsHtml}
    <div class="spotify-meta">
      <div class="spotify-actions">
        <button data-testid="spotify-change-btn" class="spotify-change-btn" onclick="showSpotifySearch()">Change</button>
        <button data-testid="spotify-save-btn" class="spotify-save-btn${isSaved ? ' saved' : ''}" onclick="saveSpotifyPlaylist()">
          ${isSaved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
    <div data-testid="spotify-search-row" class="spotify-search-row hidden" id="spotify-search-row">
      <input data-testid="spotify-query-input" type="text" id="spotify-query-input" placeholder="Search Spotify…"
             onkeydown="if(event.key==='Enter') searchSpotifyQuery()" />
      <button onclick="searchSpotifyQuery()">Search</button>
    </div>
  `;
}

function selectSpotifyOption(idx) {
  currentSpotifyData = currentSpotifyOptions[idx];
  const iframe = document.getElementById('spotify-iframe');
  if (iframe) iframe.src = currentSpotifyData.embedUrl;
  document.querySelectorAll('.spotify-option-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });
  const saveBtn = document.querySelector('.spotify-save-btn');
  if (saveBtn) {
    const isSaved = sessionGame?.spotifyEmbedUrl === currentSpotifyData.embedUrl;
    saveBtn.textContent = isSaved ? 'Saved ✓' : 'Save';
    saveBtn.classList.toggle('saved', isSaved);
  }
}

function renderSpotifyNoResult(container) {
  container.innerHTML = `
    <p data-testid="spotify-no-result" class="no-players-msg">No playlist found - try a custom search.</p>
    <div data-testid="spotify-search-row" class="spotify-search-row" id="spotify-search-row">
      <input data-testid="spotify-query-input" type="text" id="spotify-query-input" placeholder="Search Spotify…"
             onkeydown="if(event.key==='Enter') searchSpotifyQuery()" />
      <button onclick="searchSpotifyQuery()">Search</button>
    </div>
  `;
  document.getElementById('spotify-query-input')?.focus();
}

function showSpotifySearch() {
  const row = document.getElementById('spotify-search-row');
  if (!row) return;
  row.classList.toggle('hidden');
  if (!row.classList.contains('hidden')) {
    document.getElementById('spotify-query-input')?.focus();
  }
}

async function searchSpotifyQuery() {
  const input = document.getElementById('spotify-query-input');
  const query = input?.value.trim();
  if (!query) return;

  const container = document.getElementById('spotify-container');
  const queryValue = query;

  container.innerHTML = '<p class="no-players-msg">Searching…</p>';

  try {
    const res = await fetch(`/api/spotify/playlist?query=${encodeURIComponent(queryValue)}`);
    const data = await res.json();
    if (data.playlists?.length) {
      renderSpotifyOptions(container, data.playlists, 0, false);
      showSpotifySearch();
      const newInput = document.getElementById('spotify-query-input');
      if (newInput) { newInput.value = queryValue; newInput.focus(); }
    } else {
      renderSpotifyNoResult(container);
      const newInput = document.getElementById('spotify-query-input');
      if (newInput) newInput.value = queryValue;
    }
  } catch {
    container.innerHTML = '<p class="no-players-msg">Search failed — check your connection.</p>';
  }
}

function saveSpotifyPlaylist() {
  if (!currentSpotifyData || !sessionGame) return;
  const idx = games.findIndex(g => g.name === sessionGame.name);
  if (idx >= 0) {
    games[idx].spotifyEmbedUrl = currentSpotifyData.embedUrl;
    games[idx].spotifyPlaylistName = currentSpotifyData.name;
    localStorage.setItem('sz-games', JSON.stringify(games));
    sessionGame = games[idx];
  }
  const btn = document.querySelector('.spotify-save-btn');
  if (btn) { btn.textContent = 'Saved ✓'; btn.classList.add('saved'); }
}

function closeSession() {
  stopTimer();
  document.getElementById('session-modal').classList.remove('active');
}

function removeSessionPlayer(index) {
  sessionPlayers.splice(index, 1);
  renderSessionPlayers();
  renderScoreTracker();
}

function addSessionPlayer(select) {
  const id = select.value;
  if (!id) return;
  const player = vault.find(p => p.id === id);
  if (!player || sessionPlayers.some(p => p.id === id)) return;
  sessionPlayers.push(player);
  if (!(player.id in sessionScores)) sessionScores[player.id] = 0;
  renderSessionPlayers();
  renderScoreTracker();
}

function renderSessionPlayers() {
  const container = document.getElementById('session-player-list');
  const sessionIds = new Set(sessionPlayers.map(p => p.id));
  const available = vault.filter(p => !sessionIds.has(p.id));

  const addRow = available.length > 0 ? `
    <div class="add-player-row">
      <select onchange="addSessionPlayer(this)">
        <option value="">＋ Add player…</option>
        ${available.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>` : '';

  if (sessionPlayers.length === 0) {
    container.innerHTML = `<p class="no-players-msg">No players — add someone below.</p>${addRow}`;
    return;
  }
  container.innerHTML = sessionPlayers.map((p, i) => `
    <div class="player-chip">
      ${avatarHtml(p)}
      <span class="player-name">${p.name}</span>
      <button class="player-remove" onclick="removeSessionPlayer(${i})">×</button>
    </div>
  `).join('') + addRow;
}

// ── Score Tracker ──────────────────────────────────────────────────────────
function initScoreTracker() {
  scoreMode = sessionGame.cooperative ? 'winlose' : 'points';
  sessionScores = {};
  sessionOutcome = null;
  sessionPlayers.forEach(p => { sessionScores[p.id] = 0; });
  document.getElementById('winner-banner').classList.add('hidden');
  document.getElementById('winner-banner').textContent = '';
  document.getElementById('end-game-btn').disabled = false;
  document.getElementById('low-score-wins').checked = false;
  renderScoreTracker();
}

function renderScoreTracker() {
  const modeBtn = document.getElementById('score-mode-btn');
  const lowScoreLabel = document.getElementById('low-score-label');
  const scoreList = document.getElementById('score-list');

  modeBtn.textContent = scoreMode === 'points' ? 'Switch to Win/Loss' : 'Switch to Points';
  lowScoreLabel.classList.toggle('hidden', scoreMode !== 'points');

  if (scoreMode === 'winlose') {
    scoreList.innerHTML = `
      <div class="winlose-row">
        <button class="outcome-btn ${sessionOutcome === 'win' ? 'outcome-win' : ''}"
                onclick="setOutcome('win')">Victory</button>
        <button class="outcome-btn ${sessionOutcome === 'loss' ? 'outcome-loss' : ''}"
                onclick="setOutcome('loss')">Defeat</button>
      </div>
    `;
    return;
  }

  scoreList.innerHTML = sessionPlayers.map(p => `
    <div class="score-row">
      <div class="score-player">
        ${avatarHtml(p)}
        <span class="player-name">${p.name}</span>
      </div>
      <div class="score-controls-row">
        <button class="score-adj" onclick="adjustScore('${p.id}', -1)">−</button>
        <input class="score-input" type="number" value="${sessionScores[p.id] ?? 0}"
               onchange="setScore('${p.id}', this.value)"
               oninput="setScore('${p.id}', this.value)" />
        <button class="score-adj" onclick="adjustScore('${p.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function toggleScoreMode() {
  scoreMode = scoreMode === 'points' ? 'winlose' : 'points';
  sessionOutcome = null;
  renderScoreTracker();
  document.getElementById('winner-banner').classList.add('hidden');
}

function adjustScore(playerId, delta) {
  sessionScores[playerId] = (sessionScores[playerId] ?? 0) + delta;
  renderScoreTracker();
  updateWinner();
}

function setScore(playerId, value) {
  const n = parseInt(value);
  sessionScores[playerId] = isNaN(n) ? 0 : n;
  updateWinner();
}

function setOutcome(outcome) {
  sessionOutcome = outcome;
  renderScoreTracker();
}

function updateWinner() {
  if (scoreMode !== 'points' || sessionPlayers.length === 0) return;
  const lowWins = document.getElementById('low-score-wins').checked;
  const sorted = [...sessionPlayers].sort((a, b) =>
    lowWins
      ? (sessionScores[a.id] ?? 0) - (sessionScores[b.id] ?? 0)
      : (sessionScores[b.id] ?? 0) - (sessionScores[a.id] ?? 0)
  );
  // Only show live leader if scores differ
  const scores = sessionPlayers.map(p => sessionScores[p.id] ?? 0);
  const allSame = scores.every(s => s === scores[0]);
  const banner = document.getElementById('winner-banner');
  if (!allSame) {
    banner.classList.remove('hidden');
    banner.textContent = `Leading: ${sorted[0].name} (${sessionScores[sorted[0].id]})`;
  } else {
    banner.classList.add('hidden');
  }
}

function endGame() {
  if (scoreMode === 'winlose' && !sessionOutcome) {
    const banner = document.getElementById('winner-banner');
    banner.classList.remove('hidden');
    banner.textContent = 'Select Victory or Defeat first.';
    return;
  }
  stopTimer();
  feedbackByPlayer = {};
  activeFeedbackPlayer = null;
  renderFeedbackView();
  showFeedbackView();
}

function backToSession() {
  showSessionView();
}

function saveResult(result) {
  const history = JSON.parse(localStorage.getItem('sz-history') || '[]');
  history.unshift(result);
  localStorage.setItem('sz-history', JSON.stringify(history));

  // Stamp lastPlayed on each participating vault player
  result.players.forEach(rp => {
    const vp = vault.find(v => v.id === rp.id);
    if (vp) vp.lastPlayed = result.date;
  });
  saveVault();
}

// ── Session Lifecycle ──────────────────────────────────────────────────────
function showSessionView() {
  document.getElementById('left-slider').classList.remove('show-feedback');
  document.getElementById('pause-btn').classList.remove('hidden');
  const ds = document.getElementById('dice-section');
  if (ds) ds.style.display = '';
}

function showFeedbackView() {
  document.getElementById('left-slider').classList.add('show-feedback');
  document.getElementById('pause-btn').classList.add('hidden');
  const ds = document.getElementById('dice-section');
  if (ds) ds.style.display = 'none';
}

function pauseSession() {
  stopTimer();
  const state = {
    id: currentSessionId,
    game: sessionGame,
    players: sessionPlayers,
    scores: { ...sessionScores },
    scoreMode,
    lowScoreWins: document.getElementById('low-score-wins').checked,
    outcome: sessionOutcome,
    timerSeconds,
    pausedAt: new Date().toISOString(),
  };
  const sessions = JSON.parse(localStorage.getItem('sz-active-sessions') || '[]');
  const idx = sessions.findIndex(s => s.id === state.id);
  if (idx >= 0) sessions[idx] = state;
  else sessions.push(state);
  localStorage.setItem('sz-active-sessions', JSON.stringify(sessions));
  document.getElementById('session-modal').classList.remove('active');
  renderGamesInProgress();
}

function resumeSession(sessionId) {
  const sessions = JSON.parse(localStorage.getItem('sz-active-sessions') || '[]');
  const state = sessions.find(s => s.id === sessionId);
  if (!state) return;

  currentSessionId   = state.id;
  sessionGame        = state.game;
  sessionPlayers     = state.players;
  sessionScores      = state.scores;
  scoreMode          = state.scoreMode;
  sessionOutcome     = state.outcome;
  timerSeconds       = state.timerSeconds;

  document.getElementById('session-game-title').textContent = sessionGame.name;
  document.getElementById('low-score-wins').checked = state.lowScoreWins;

  showSessionView();
  renderSessionPlayers();
  renderScoreTracker();
  renderTimerDisplay();
  loadSpotifyPlaylist(sessionGame);
  document.getElementById('session-modal').classList.add('active');
}

function renderGamesInProgress() {
  const sessions = JSON.parse(localStorage.getItem('sz-active-sessions') || '[]');
  const section = document.getElementById('games-in-progress');
  const list = document.getElementById('gip-list');
  if (!section || !list) return;

  if (sessions.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = sessions.map(s => {
    const h = Math.floor(s.timerSeconds / 3600);
    const m = Math.floor((s.timerSeconds % 3600) / 60);
    const elapsed = `${h}:${String(m).padStart(2, '0')}`;
    const avatars = s.players.map(p => avatarHtml(p)).join('');
    return `
      <div class="gip-card">
        <div class="gip-info">
          <div class="gip-game">${s.game.name}</div>
          <div class="gip-meta">
            <div class="gip-players">${avatars}</div>
            <span class="gip-time">⏱ ${elapsed}</span>
          </div>
        </div>
        <button class="resume-btn" onclick="resumeSession('${s.id}')">Resume Session</button>
      </div>
    `;
  }).join('');
}

// ── Play History ───────────────────────────────────────────────────────────
function openHistory() {
  renderHistory();
  document.getElementById('history-modal').classList.add('active');
}

function closeHistory() {
  document.getElementById('history-modal').classList.remove('active');
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('sz-history') || '[]');
  const container = document.getElementById('history-list');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<p class="no-players-msg">No sessions recorded yet.</p>';
    return;
  }

  container.innerHTML = history.map(entry => {
    const date = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: '2-digit',
    });

    const h = Math.floor(entry.timerSeconds / 3600);
    const m = Math.floor((entry.timerSeconds % 3600) / 60);
    const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;

    let resultHtml = '';
    if (entry.mode === 'winlose') {
      resultHtml = entry.outcome === 'win' ? '🎉 Victory' : '💀 Defeat';
    } else {
      const sorted = [...entry.players].sort((a, b) =>
        entry.lowScoreWins ? a.score - b.score : b.score - a.score
      );
      resultHtml = sorted.map((p, i) =>
        `<span class="${i === 0 ? 'history-winner' : ''}">${p.name}: ${p.score}</span>`
      ).join('<span class="history-sep"> · </span>');
    }

    const feedbackValues = entry.feedback ? Object.values(entry.feedback) : [];
    const ratings = feedbackValues.map(f => f.rating).filter(Boolean);
    const avgRating = ratings.length
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : 0;
    const ratingHtml = avgRating
      ? `<span class="history-stars">${'★'.repeat(avgRating)}${'☆'.repeat(5 - avgRating)}</span>`
      : '';

    const paCounts = { yes: 0, maybe: 0, no: 0 };
    feedbackValues.forEach(f => { if (f.playAgain) paCounts[f.playAgain]++; });
    const paHtml = [
      paCounts.yes   ? `${paCounts.yes} 👍`   : '',
      paCounts.maybe ? `${paCounts.maybe} 🤔` : '',
      paCounts.no    ? `${paCounts.no} 👎`    : '',
    ].filter(Boolean).join(' · ');

    const playerAvatars = entry.players.map(p => {
      const vp = vault.find(v => v.id === p.id);
      return vp ? avatarHtml(vp) : `<div class="avatar avatar-initials" style="background:#6a7a90">${p.name[0].toUpperCase()}</div>`;
    }).join('');

    return `
      <div class="history-card">
        <div class="history-card-top">
          <span class="history-game">${entry.game}</span>
          <span class="history-date">${date}</span>
        </div>
        <div class="history-players">${playerAvatars}</div>
        <div class="history-result">${resultHtml}</div>
        <div class="history-meta">
          <span>⏱ ${duration}</span>
          ${ratingHtml}
          ${paHtml ? `<span>${paHtml}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Player Stats ───────────────────────────────────────────────────────────
let activeStatsTab = 'players';
let h2hSelected = { a: null, b: null };

function openStats() {
  switchStatsTab('players');
  renderStats();
  document.getElementById('stats-modal').classList.add('active');
}

function closeStats() {
  document.getElementById('stats-modal').classList.remove('active');
}

function switchStatsTab(tab) {
  activeStatsTab = tab;
  document.getElementById('stats-body-players').classList.toggle('hidden', tab !== 'players');
  document.getElementById('stats-body-h2h').classList.toggle('hidden', tab !== 'h2h');
  document.getElementById('tab-players').classList.toggle('active', tab === 'players');
  document.getElementById('tab-h2h').classList.toggle('active', tab === 'h2h');
  if (tab === 'h2h') renderH2HSelectors();
}

function computePlayerStats(playerId) {
  const history = JSON.parse(localStorage.getItem('sz-history') || '[]');
  const sessions = history.filter(e => e.players.some(p => p.id === playerId));
  const gamesPlayed = sessions.length;

  const wins = sessions.filter(e => {
    if (e.mode === 'winlose') return e.outcome === 'win';
    return e.players.find(p => p.id === playerId)?.winner === true;
  }).length;

  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : null;

  const gameCounts = {};
  sessions.forEach(e => { gameCounts[e.game] = (gameCounts[e.game] || 0) + 1; });
  const favoriteEntry = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0];

  const ratings = sessions.map(e => e.feedback?.[playerId]?.rating).filter(Boolean);
  const avgRating = ratings.length
    ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
    : 0;

  const paCounts = { yes: 0, maybe: 0, no: 0 };
  sessions.forEach(e => {
    const pa = e.feedback?.[playerId]?.playAgain;
    if (pa) paCounts[pa]++;
  });

  return { gamesPlayed, wins, winRate, favoriteEntry, avgRating, paCounts };
}

function renderStats() {
  const container = document.getElementById('stats-list');
  if (!container) return;

  if (vault.length === 0) {
    container.innerHTML = '<p class="no-players-msg">No players in the vault yet.</p>';
    return;
  }

  container.innerHTML = vault.map(player => {
    const s = computePlayerStats(player.id);

    if (s.gamesPlayed === 0) {
      return `
        <div class="stats-card">
          <div class="stats-card-header">
            ${avatarHtml(player)}
            <span class="stats-player-name">${player.name}</span>
          </div>
          <p class="no-players-msg">No sessions recorded yet.</p>
        </div>
      `;
    }

    const winRateHtml = s.winRate !== null
      ? `<div class="stats-row"><span>Win Rate</span><span>${s.winRate}% (${s.wins} of ${s.gamesPlayed})</span></div>`
      : '';

    const favoriteHtml = s.favoriteEntry
      ? `<div class="stats-row"><span>Favorite Game</span><span>${s.favoriteEntry[0]} <span class="stats-muted">(${s.favoriteEntry[1]}×)</span></span></div>`
      : '';

    const ratingHtml = s.avgRating
      ? `<div class="stats-row"><span>Avg Rating Given</span><span class="stats-stars">${'★'.repeat(s.avgRating)}${'☆'.repeat(5 - s.avgRating)}</span></div>`
      : '';

    const paTotal = s.paCounts.yes + s.paCounts.maybe + s.paCounts.no;
    const paHtml = paTotal > 0
      ? `<div class="stats-row"><span>Play Again</span><span>${
          [s.paCounts.yes   ? `${s.paCounts.yes} 👍`   : '',
           s.paCounts.maybe ? `${s.paCounts.maybe} 🤔` : '',
           s.paCounts.no    ? `${s.paCounts.no} 👎`    : '']
          .filter(Boolean).join(' · ')
        }</span></div>`
      : '';

    return `
      <div class="stats-card">
        <div class="stats-card-header">
          ${avatarHtml(player)}
          <span class="stats-player-name">${player.name}</span>
          <span class="stats-games-played">${s.gamesPlayed} session${s.gamesPlayed !== 1 ? 's' : ''}</span>
        </div>
        <div class="stats-rows">
          ${winRateHtml}
          ${favoriteHtml}
          ${ratingHtml}
          ${paHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderH2HSelectors() {
  ['a', 'b'].forEach(side => {
    const container = document.getElementById(`h2h-selector-${side}`);
    if (!container) return;
    const selectedId = h2hSelected[side];
    container.innerHTML = vault.map(p => `
      <div class="h2h-chip ${p.id === selectedId ? 'active' : ''}"
           onclick="selectH2HPlayer('${side}', '${p.id}')">
        ${avatarHtml(p)}
        <span class="player-name">${p.name}</span>
      </div>
    `).join('');
  });
  renderH2HResult();
}

function selectH2HPlayer(side, id) {
  h2hSelected[side] = h2hSelected[side] === id ? null : id;
  renderH2HSelectors();
}

function computeHeadToHead(idA, idB) {
  const history = JSON.parse(localStorage.getItem('sz-history') || '[]');
  const shared = history.filter(e =>
    e.players.some(p => p.id === idA) && e.players.some(p => p.id === idB)
  );

  let winsA = 0, winsB = 0, ties = 0, coop = 0;

  shared.forEach(e => {
    if (e.mode === 'winlose') {
      coop++;
      return;
    }
    const pA = e.players.find(p => p.id === idA);
    const pB = e.players.find(p => p.id === idB);
    const scoreA = pA?.score ?? 0;
    const scoreB = pB?.score ?? 0;
    const lowWins = e.lowScoreWins ?? false;

    if (scoreA === scoreB) {
      ties++;
    } else if (lowWins ? scoreA < scoreB : scoreA > scoreB) {
      winsA++;
    } else {
      winsB++;
    }
  });

  return { total: shared.length, winsA, winsB, ties, coop };
}

function renderH2HResult() {
  const container = document.getElementById('h2h-result');
  if (!container) return;
  const { a: idA, b: idB } = h2hSelected;

  if (!idA || !idB) {
    container.innerHTML = '<p class="no-players-msg">Select two players to see their record.</p>';
    return;
  }
  if (idA === idB) {
    container.innerHTML = '<p class="no-players-msg">Select two different players.</p>';
    return;
  }

  const playerA = vault.find(p => p.id === idA);
  const playerB = vault.find(p => p.id === idB);
  const r = computeHeadToHead(idA, idB);

  if (r.total === 0) {
    container.innerHTML = '<p class="no-players-msg">These players haven\'t played together yet.</p>';
    return;
  }

  const competitive = r.total - r.coop;

  container.innerHTML = `
    <div class="h2h-scoreboard">
      <div class="h2h-player">
        ${avatarHtml(playerA)}
        <span class="h2h-name">${playerA.name}</span>
        <span class="h2h-score ${r.winsA > r.winsB ? 'h2h-leader' : ''}">${r.winsA}</span>
      </div>
      <div class="h2h-divider">–</div>
      <div class="h2h-player h2h-player-right">
        <span class="h2h-score ${r.winsB > r.winsA ? 'h2h-leader' : ''}">${r.winsB}</span>
        <span class="h2h-name">${playerB.name}</span>
        ${avatarHtml(playerB)}
      </div>
    </div>
    <div class="h2h-meta">
      <span>${r.total} session${r.total !== 1 ? 's' : ''} together</span>
      ${competitive > 0 ? `<span>${competitive} competitive</span>` : ''}
      ${r.ties > 0 ? `<span>${r.ties} tie${r.ties !== 1 ? 's' : ''}</span>` : ''}
      ${r.coop > 0 ? `<span>${r.coop} co-op</span>` : ''}
    </div>
  `;
}

function finalizeSession() {
  const lowWins = document.getElementById('low-score-wins')?.checked ?? false;
  let players;

  if (scoreMode === 'winlose') {
    players = sessionPlayers.map(p => ({ id: p.id, name: p.name }));
  } else {
    const sorted = [...sessionPlayers].sort((a, b) =>
      lowWins
        ? (sessionScores[a.id] ?? 0) - (sessionScores[b.id] ?? 0)
        : (sessionScores[b.id] ?? 0) - (sessionScores[a.id] ?? 0)
    );
    players = sorted.map((p, i) => ({
      id: p.id, name: p.name,
      score: sessionScores[p.id] ?? 0,
      winner: i === 0,
    }));
  }

  const result = {
    id: currentSessionId,
    date: new Date().toISOString().split('T')[0],
    game: sessionGame.name,
    mode: scoreMode,
    ...(scoreMode === 'winlose' ? { outcome: sessionOutcome } : { lowScoreWins: lowWins }),
    players,
    timerSeconds,
    feedback: Object.fromEntries(
      Object.entries(feedbackByPlayer).map(([id, fb]) => [id, {
        rating: fb.rating || null,
        playAgain: fb.playAgain,
        notes: fb.notes.trim() || null,
      }])
    ),
  };

  saveResult(result);

  const sessions = JSON.parse(localStorage.getItem('sz-active-sessions') || '[]');
  localStorage.setItem('sz-active-sessions',
    JSON.stringify(sessions.filter(s => s.id !== currentSessionId))
  );

  currentSessionId = null;
  document.getElementById('session-modal').classList.remove('active');
  showSessionView();
  renderGamesInProgress();
}

function renderFeedbackView() {
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;
  const duration = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  let resultLine = '';
  if (scoreMode === 'winlose') {
    resultLine = sessionOutcome
      ? (sessionOutcome === 'win' ? '🎉 Victory' : '💀 Defeat')
      : 'Not recorded';
  } else {
    const lowWins = document.getElementById('low-score-wins')?.checked ?? false;
    const sorted = [...sessionPlayers].sort((a, b) =>
      lowWins
        ? (sessionScores[a.id] ?? 0) - (sessionScores[b.id] ?? 0)
        : (sessionScores[b.id] ?? 0) - (sessionScores[a.id] ?? 0)
    );
    resultLine = sorted.map(p => `${p.name}: ${sessionScores[p.id] ?? 0}`).join(' · ');
  }

  document.getElementById('feedback-summary').innerHTML = `
    <div class="summary-row"><span>Players</span><span>${sessionPlayers.map(p => p.name).join(', ')}</span></div>
    <div class="summary-row"><span>Duration</span><span>${duration}</span></div>
    <div class="summary-row"><span>Result</span><span>${resultLine}</span></div>
  `;

  // Initialize per-player feedback state
  sessionPlayers.forEach(p => {
    if (!feedbackByPlayer[p.id]) {
      feedbackByPlayer[p.id] = { rating: 0, playAgain: null, notes: '' };
    }
  });
  activeFeedbackPlayer = sessionPlayers[0]?.id ?? null;

  renderFeedbackPlayerChips();
  renderPlayerFeedbackForm();
}

function renderFeedbackPlayerChips() {
  const chips = document.getElementById('feedback-player-chips');
  const progress = document.getElementById('feedback-progress');
  if (!chips || !progress) return;

  const doneCount = sessionPlayers.filter(p => {
    const fb = feedbackByPlayer[p.id];
    return fb && (fb.rating > 0 || fb.playAgain !== null);
  }).length;
  progress.textContent = `${doneCount} of ${sessionPlayers.length} done`;

  chips.innerHTML = sessionPlayers.map(p => {
    const fb = feedbackByPlayer[p.id];
    const done = fb && (fb.rating > 0 || fb.playAgain !== null);
    const active = p.id === activeFeedbackPlayer;
    return `
      <div class="feedback-chip ${active ? 'active' : ''} ${done ? 'done' : ''}"
           onclick="selectFeedbackPlayer('${p.id}')">
        ${avatarHtml(p)}
        <span class="player-name">${p.name}</span>
        ${done ? '<span class="feedback-chip-check">✓</span>' : ''}
      </div>
    `;
  }).join('');
}

function renderPlayerFeedbackForm() {
  const player = sessionPlayers.find(p => p.id === activeFeedbackPlayer);
  const container = document.getElementById('feedback-player-form');
  if (!player || !container) return;

  const fb = feedbackByPlayer[player.id];
  const stars = [1, 2, 3, 4, 5].map(i =>
    `<button class="star-btn ${i <= fb.rating ? 'star-on' : ''}" onclick="setRating(${i})">★</button>`
  ).join('');

  container.innerHTML = `
    <div class="feedback-active-player">
      ${avatarHtml(player)}
      <span class="feedback-active-name">${player.name}</span>
    </div>
    <div class="feedback-field">
      <div class="modal-section-label">Rating</div>
      <div class="star-rating">${stars}</div>
    </div>
    <div class="feedback-field">
      <div class="modal-section-label">Play Again?</div>
      <div class="play-again-btns">
        <button class="play-again-btn ${fb.playAgain === 'yes'   ? 'play-again-active' : ''}" onclick="setPlayAgain('yes')">👍 Yes</button>
        <button class="play-again-btn ${fb.playAgain === 'maybe' ? 'play-again-active' : ''}" onclick="setPlayAgain('maybe')">🤔 Maybe</button>
        <button class="play-again-btn ${fb.playAgain === 'no'    ? 'play-again-active' : ''}" onclick="setPlayAgain('no')">👎 No</button>
      </div>
    </div>
    <div class="feedback-field">
      <div class="modal-section-label">Notes</div>
      <textarea class="session-notes" oninput="saveFeedbackNotes(this.value)"
                placeholder="Highlights, house rules, memorable moments…">${fb.notes}</textarea>
    </div>
  `;
}

function selectFeedbackPlayer(id) {
  activeFeedbackPlayer = id;
  renderFeedbackPlayerChips();
  renderPlayerFeedbackForm();
}

function setRating(n) {
  if (!activeFeedbackPlayer) return;
  feedbackByPlayer[activeFeedbackPlayer].rating = n;
  renderPlayerFeedbackForm();
  renderFeedbackPlayerChips();
}

function setPlayAgain(val) {
  if (!activeFeedbackPlayer) return;
  feedbackByPlayer[activeFeedbackPlayer].playAgain = val;
  renderPlayerFeedbackForm();
  renderFeedbackPlayerChips();
}

function saveFeedbackNotes(val) {
  if (!activeFeedbackPlayer) return;
  feedbackByPlayer[activeFeedbackPlayer].notes = val;
}


// ── Game Library ───────────────────────────────────────────────────────────
let librarySortKey = 'name';
let librarySortDir = 1;   // 1 = asc, -1 = desc
let libraryDisplayed = []; // { game, idx } — maps display rows back to games[]

const GAME_TYPES       = ['Abstract','Board','Card','Dice','Mystery','Narrative','Party'];
const GAME_COMPLEXITIES = ['Low','Medium','High'];

function openLibrary() {
  renderLibrary();
  document.getElementById('library-modal').classList.add('active');
  document.getElementById('library-search').focus();
}

function closeLibrary() {
  document.getElementById('library-modal').classList.remove('active');
  const form = document.getElementById('add-game-form');
  if (form) form.classList.add('hidden');
}

function setLibrarySort(key) {
  if (librarySortKey === key) {
    librarySortDir *= -1;
  } else {
    librarySortKey = key;
    librarySortDir = key === 'rating' ? -1 : 1; // rating defaults desc
  }
  document.querySelectorAll('.lib-sort-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`lib-sort-${key}`)?.classList.add('active');
  renderLibrary();
}

function renderLibrary() {
  const query = document.getElementById('library-search')?.value.trim().toLowerCase() || '';

  let list = games.map((game, idx) => ({ game, idx }));

  if (query) {
    list = list.filter(({ game }) => game.name.toLowerCase().includes(query));
  }

  list.sort((a, b) => {
    let va, vb;
    if (librarySortKey === 'name')    { va = a.game.name; vb = b.game.name; return librarySortDir * va.localeCompare(vb); }
    if (librarySortKey === 'rating')  { va = a.game.rating ?? 0; vb = b.game.rating ?? 0; }
    if (librarySortKey === 'players') { va = a.game.maxPlayers; vb = b.game.maxPlayers; }
    if (librarySortKey === 'time')    { va = a.game.playTime; vb = b.game.playTime; }
    return librarySortDir * (va - vb);
  });

  libraryDisplayed = list;

  const countEl = document.getElementById('library-count');
  if (countEl) countEl.textContent = `${list.length} of ${games.length} game${games.length !== 1 ? 's' : ''}`;

  const container = document.getElementById('library-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<p class="no-players-msg">No games match your search.</p>';
    return;
  }

  container.innerHTML = list.map(({ game, idx }, di) => {
    const thumb = game.thumbnail
      ? `<img class="lib-thumb" src="${game.thumbnail}" alt="" loading="lazy" />`
      : `<div class="lib-thumb lib-thumb-initials">${game.name.charAt(0).toUpperCase()}</div>`;

    const stars = [1,2,3,4,5].map(n =>
      `<span class="lib-star${(game.rating ?? 0) >= n ? ' filled' : ''}" data-testid="lib-star" onclick="setGameRating(${di}, ${n})"
        title="${n} star${n>1?'s':''}">★</span>`
    ).join('');

    const players = game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}p`
      : `${game.minPlayers}–${game.maxPlayers}p`;

    const time = game.playTime >= 999 ? '∞' : `${game.playTime}m`;

    const spotifyBadge = game.spotifyPlaylistName
      ? `<span class="lib-badge lib-spotify-badge" title="${game.spotifyPlaylistName.replace(/"/g,'&quot;')}">♫</span>`
      : '';

    const bggLink = game.bggId
      ? `<a class="lib-badge lib-bgg-badge" href="https://boardgamegeek.com/boardgame/${game.bggId}" target="_blank" rel="noopener">BGG↗</a>`
      : '';

    return `
      <div class="lib-row" data-testid="lib-row">
        ${thumb}
        <div class="lib-info">
          <div class="lib-name">${game.name}</div>
          <div class="lib-meta">${players} · ${time} · Ages ${game.age}+</div>
        </div>
        <div class="lib-controls">
          <div class="lib-rating">${stars}</div>
          <button class="lib-tag lib-type-tag" onclick="cycleGameField(${di},'type')" title="Click to change type">${game.type}</button>
          <button class="lib-tag lib-complexity-tag lib-complexity-${(game.complexity||'Medium').toLowerCase()}" onclick="cycleGameField(${di},'complexity')" title="Click to change complexity">${game.complexity}</button>
          <button class="lib-toggle${game.cooperative ? ' on' : ''}" onclick="toggleGameField(${di},'cooperative')">Co-op</button>
          <button class="lib-toggle${game.played ? ' on' : ''}" onclick="toggleGameField(${di},'played')">Played</button>
          ${spotifyBadge}${bggLink}
          <button class="lib-delete" data-testid="lib-delete" onclick="deleteGame(${di})" title="Remove from library">×</button>
        </div>
      </div>`;
  }).join('');
}

function saveGames() {
  localStorage.setItem('sz-games', JSON.stringify(games));
}

function setGameRating(displayIdx, n) {
  const { game, idx } = libraryDisplayed[displayIdx];
  // clicking the same star again clears the rating
  games[idx].rating = game.rating === n ? null : n;
  saveGames();
  renderLibrary();
}

function cycleGameField(displayIdx, field) {
  const { game, idx } = libraryDisplayed[displayIdx];
  if (field === 'type') {
    const i = GAME_TYPES.indexOf(game.type);
    games[idx].type = GAME_TYPES[(i + 1) % GAME_TYPES.length];
  } else if (field === 'complexity') {
    const i = GAME_COMPLEXITIES.indexOf(game.complexity);
    games[idx].complexity = GAME_COMPLEXITIES[(i + 1) % GAME_COMPLEXITIES.length];
  }
  saveGames();
  renderLibrary();
}

function toggleGameField(displayIdx, field) {
  const { idx } = libraryDisplayed[displayIdx];
  games[idx][field] = !games[idx][field];
  saveGames();
  renderLibrary();
}

function deleteGame(displayIdx) {
  const { game, idx } = libraryDisplayed[displayIdx];
  if (!confirm(`Remove "${game.name}" from your library?`)) return;
  games.splice(idx, 1);
  saveGames();
  renderLibrary();
}

function toggleAddGameForm() {
  const form = document.getElementById('add-game-form');
  const isHidden = form.classList.toggle('hidden');
  if (!isHidden) document.getElementById('ag-name')?.focus();
}

function submitAddGame() {
  const name = document.getElementById('ag-name')?.value.trim();
  if (!name) {
    document.getElementById('ag-name')?.classList.add('input-error');
    setTimeout(() => document.getElementById('ag-name')?.classList.remove('input-error'), 1200);
    return;
  }
  if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    alert(`"${name}" is already in your library.`);
    return;
  }
  const minPlayers = parseInt(document.getElementById('ag-min-players')?.value) || 2;
  const maxPlayers = parseInt(document.getElementById('ag-max-players')?.value) || minPlayers;
  games.push({
    name,
    type:       document.getElementById('ag-type')?.value || 'Board',
    complexity: document.getElementById('ag-complexity')?.value || 'Medium',
    minPlayers,
    maxPlayers,
    playTime:   parseInt(document.getElementById('ag-playtime')?.value) || 60,
    age:        parseInt(document.getElementById('ag-age')?.value) || 0,
    setupTime:  10,
    cooperative: document.getElementById('ag-coop')?.checked || false,
    rating:     null,
    played:     false,
    thumbnail:  null,
    bggId:      null,
  });
  saveGames();
  // reset form
  ['ag-name','ag-min-players','ag-max-players','ag-playtime','ag-age'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('ag-coop').checked = false;
  toggleAddGameForm();
  // sort by name and re-render
  librarySortKey = 'name'; librarySortDir = 1;
  renderLibrary();
}

// ── Timer ──────────────────────────────────────────────────────────────────
function toggleTimer() {
  if (timerInterval) {
    stopTimer();
  } else {
    timerInterval = setInterval(() => {
      timerSeconds++;
      renderTimerDisplay();
    }, 1000);
    document.getElementById('timer-toggle-btn').textContent = 'Pause';
  }
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  const btn = document.getElementById('timer-toggle-btn');
  if (btn) btn.textContent = 'Start';
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  renderTimerDisplay();
}

function renderTimerDisplay() {
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;
  const el = document.getElementById('timer-display');
  if (el) el.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Dice Roller ────────────────────────────────────────────────────────────
let selectedDieSides = 6;
let diceHistory = [];
let diceRolling = false;

// Each entry: [cx, cy, r] — value 1 uses a larger pip so it reads clearly
const D6_PIPS = {
  1: [[32, 32, 7]],
  2: [[18, 18, 5], [46, 46, 5]],
  3: [[18, 18, 5], [32, 32, 5], [46, 46, 5]],
  4: [[18, 18, 5], [46, 18, 5], [18, 46, 5], [46, 46, 5]],
  5: [[18, 18, 5], [46, 18, 5], [32, 32, 5], [18, 46, 5], [46, 46, 5]],
  6: [[18, 14, 5], [46, 14, 5], [18, 32, 5], [46, 32, 5], [18, 50, 5], [46, 50, 5]],
};

const DIE_CONFIG = {
  4:  { path: 'M32,5 L61,59 L3,59 Z',                      tx: 32, ty: 47 },
  8:  { path: 'M32,5 L59,32 L32,59 L5,32 Z',               tx: 32, ty: 35 },
  10: { path: 'M32,5 L57,26 L48,59 L32,50 L16,59 L7,26 Z', tx: 32, ty: 36 },
  12: { path: 'M32,5 L58,24 L49,56 L15,56 L6,24 Z',        tx: 32, ty: 38 },
  20: { path: 'M32,5 L62,59 L2,59 Z',                      tx: 32, ty: 44 },
};

function renderDiceFace(sides, value, rolling) {
  const svg = document.getElementById('dice-svg');
  if (!svg) return;
  const stroke = rolling ? '#2a3a5e' : '#f5c842';
  const fill   = '#0f3460';
  const ink    = rolling ? '#2a3a5e' : '#f5c842';

  if (sides === 6) {
    const pips = (value && D6_PIPS[value]) ? D6_PIPS[value] : [];
    const dots = pips.map(([cx, cy, r]) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>`
    ).join('');
    svg.innerHTML =
      `<rect x="4" y="4" width="56" height="56" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>` +
      dots;
  } else {
    const cfg = DIE_CONFIG[sides];
    if (!cfg) return;
    const label = value != null ? String(value) : '';
    const fs = sides === 20 && value >= 10 ? 16 : 18;
    svg.innerHTML =
      `<path d="${cfg.path}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<text x="${cfg.tx}" y="${cfg.ty}" text-anchor="middle" dominant-baseline="middle"
             fill="${ink}" font-size="${fs}" font-weight="700" font-family="inherit">${label}</text>`;
  }
}

function selectDie(btn) {
  document.querySelectorAll('.dice-die-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDieSides = parseInt(btn.dataset.sides);
  renderDiceFace(selectedDieSides, null, false);
}

function rollDie() {
  if (diceRolling) return;
  diceRolling = true;
  const finalResult = Math.floor(Math.random() * selectedDieSides) + 1;
  const btn = document.querySelector('.dice-roll-btn');
  const svg = document.getElementById('dice-svg');
  btn.disabled = true;

  svg.classList.remove('dice-shaking');
  void svg.offsetWidth;
  svg.classList.add('dice-shaking');

  let cycles = 0;
  const interval = setInterval(() => {
    const rand = Math.floor(Math.random() * selectedDieSides) + 1;
    renderDiceFace(selectedDieSides, rand, true);
    cycles++;
    if (cycles >= 8) {
      clearInterval(interval);
      renderDiceFace(selectedDieSides, finalResult, false);
      btn.disabled = false;
      diceRolling = false;

      diceHistory.unshift({ sides: selectedDieSides, result: finalResult });
      if (diceHistory.length > 5) diceHistory.pop();
      renderDiceHistory();
    }
  }, 60);
}

function renderDiceHistory() {
  const el = document.getElementById('dice-history');
  if (!el) return;
  el.innerHTML = diceHistory
    .map(r => `<span class="dice-history-chip">d${r.sides}: <strong>${r.result}</strong></span>`)
    .join('');
}

function resetDiceRoller() {
  selectedDieSides = 6;
  diceHistory = [];
  diceRolling = false;
  document.querySelectorAll('.dice-die-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sides === '6');
  });
  renderDiceFace(6, null, false);
  const histEl = document.getElementById('dice-history');
  if (histEl) histEl.innerHTML = '';
}

// ── Quick Search ───────────────────────────────────────────────────────────
function onSearchInput() {
  const query = document.getElementById('search-input').value.trim();
  const clearBtn = document.getElementById('search-clear-btn');
  clearBtn.classList.toggle('hidden', query.length === 0);

  if (query.length === 0) {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('no-results').classList.add('hidden');
    return;
  }

  const lower = query.toLowerCase();
  const matches = games.filter(g => g.name.toLowerCase().includes(lower));
  renderResults(matches, `${matches.length} match${matches.length !== 1 ? 'es' : ''} for "${query}"`);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear-btn').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('no-results').classList.add('hidden');
  document.getElementById('search-input').focus();
}

// ── Suggest / Surprise ─────────────────────────────────────────────────────
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
