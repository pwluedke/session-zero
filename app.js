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
let feedbackRating = 0;
let feedbackPlayAgain = null;

// ── Init ───────────────────────────────────────────────────────────────────
fetch("games.json")
  .then(res => res.json())
  .then(data => { games = data; })
  .catch(() => console.error("Could not load games.json"));

renderRollCall();
renderGamesInProgress();

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
      <div class="vault-row">
        ${avatarHtml(p, true)}
        <span class="vault-col-player">${p.name}</span>
        <span class="vault-col-date">${formatLastPlayed(p.lastPlayed)}</span>
        <button class="player-remove" onclick="removeFromVault('${p.id}')">×</button>
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
      <div class="roll-call-chip ${active ? 'active' : ''}" onclick="toggleRollCall('${p.id}')">
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
    li.innerHTML = `
      <div class="game-card-main">
        <div>
          <div class="game-name">${game.name}</div>
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
          <button class="why-btn" onclick="event.stopPropagation(); askWhy(this, ${JSON.stringify(game).replace(/"/g, '&quot;')}, ${JSON.stringify(filters).replace(/"/g, '&quot;')})">Why?</button>
        </div>
      </div>
      <div class="game-detail hidden">
        <div class="game-detail-meta">
          <span>🎂 Ages ${game.age}+</span>
          ${game.cooperative ? '<span class="coop-tag">🤝 Co-op</span>' : ''}
          <span>${game.played ? '✓ Played before' : '✨ New to us'}</span>
        </div>
        <button class="lets-play-btn" onclick="event.stopPropagation(); openSession(${index})">Let's Play!</button>
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
  loadSpotifyPlaylist(sessionGame);
  document.getElementById('session-modal').classList.add('active');
}

async function loadSpotifyPlaylist(game) {
  const container = document.getElementById('spotify-container');
  container.innerHTML = '<p class="no-players-msg">Finding music…</p>';
  try {
    const res = await fetch(
      `/api/spotify/playlist?game=${encodeURIComponent(game.name)}&type=${encodeURIComponent(game.type)}`
    );
    const data = await res.json();
    if (data.embedUrl) {
      container.innerHTML = `
        <iframe
          src="${data.embedUrl}"
          width="100%"
          height="152"
          frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy">
        </iframe>
      `;
    } else {
      container.innerHTML = '<p class="no-players-msg">No playlist found for this game.</p>';
    }
  } catch {
    container.innerHTML = '<p class="no-players-msg">Could not load music.</p>';
  }
}

function closeSession() {
  stopTimer();
  document.getElementById('session-modal').classList.remove('active');
}

function removeSessionPlayer(index) {
  sessionPlayers.splice(index, 1);
  renderSessionPlayers();
}

function renderSessionPlayers() {
  const container = document.getElementById('session-player-list');
  if (sessionPlayers.length === 0) {
    container.innerHTML = '<p class="no-players-msg">No players on the Roll Call — tap players above to add them.</p>';
    return;
  }
  container.innerHTML = sessionPlayers.map((p, i) => `
    <div class="player-chip">
      ${avatarHtml(p)}
      <span class="player-name">${p.name}</span>
      <button class="player-remove" onclick="removeSessionPlayer(${i})">×</button>
    </div>
  `).join('');
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
  const lowWins = document.getElementById('low-score-wins').checked;

  if (scoreMode === 'winlose') {
    if (!sessionOutcome) {
      const banner = document.getElementById('winner-banner');
      banner.classList.remove('hidden');
      banner.textContent = 'Select Victory or Defeat first.';
      return;
    }
    const banner = document.getElementById('winner-banner');
    banner.classList.remove('hidden');
    banner.textContent = sessionOutcome === 'win' ? '🎉 Victory!' : '💀 Defeated.';
  } else {
    const sorted = [...sessionPlayers].sort((a, b) =>
      lowWins
        ? (sessionScores[a.id] ?? 0) - (sessionScores[b.id] ?? 0)
        : (sessionScores[b.id] ?? 0) - (sessionScores[a.id] ?? 0)
    );
    const banner = document.getElementById('winner-banner');
    banner.classList.remove('hidden');
    banner.textContent = `🏆 ${sorted[0].name} wins!`;
  }
  document.getElementById('end-game-btn').disabled = true;
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
  document.getElementById('modal-body').classList.remove('hidden');
  document.getElementById('feedback-body').classList.add('hidden');
  document.getElementById('pause-btn').classList.remove('hidden');
  document.getElementById('finalize-btn').classList.remove('hidden');
}

function showFeedbackView() {
  document.getElementById('modal-body').classList.add('hidden');
  document.getElementById('feedback-body').classList.remove('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('finalize-btn').classList.add('hidden');
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

function finalizeSession() {
  stopTimer();
  feedbackRating = 0;
  feedbackPlayAgain = null;
  renderFeedbackView();
  showFeedbackView();
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

  document.getElementById('session-notes').value = '';
  renderStars(0);
  renderPlayAgain(null);
}

function renderStars(rating) {
  const container = document.getElementById('star-rating');
  if (!container) return;
  container.innerHTML = [1, 2, 3, 4, 5].map(i =>
    `<button class="star-btn ${i <= rating ? 'star-on' : ''}" onclick="setRating(${i})">★</button>`
  ).join('');
}

function setRating(n) {
  feedbackRating = n;
  renderStars(n);
}

function renderPlayAgain(val) {
  ['yes', 'maybe', 'no'].forEach(v => {
    const btn = document.getElementById(`pa-${v}`);
    if (btn) btn.classList.toggle('play-again-active', val === v);
  });
}

function setPlayAgain(val) {
  feedbackPlayAgain = val;
  renderPlayAgain(val);
}

function endSession() {
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
    rating: feedbackRating || null,
    playAgain: feedbackPlayAgain,
    notes: document.getElementById('session-notes')?.value.trim() || null,
  };

  saveResult(result);

  // Remove from active sessions
  const sessions = JSON.parse(localStorage.getItem('sz-active-sessions') || '[]');
  localStorage.setItem('sz-active-sessions',
    JSON.stringify(sessions.filter(s => s.id !== currentSessionId))
  );

  currentSessionId = null;
  document.getElementById('session-modal').classList.remove('active');
  showSessionView();
  renderGamesInProgress();
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
