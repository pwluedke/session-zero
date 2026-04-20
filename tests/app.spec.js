const { test, expect } = require('@playwright/test');
const { MainPage }     = require('./pages/MainPage');
const { VaultModal }   = require('./pages/VaultModal');
const { SessionModal } = require('./pages/SessionModal');
const { LibraryModal } = require('./pages/LibraryModal');
const { SettingsModal } = require('./pages/SettingsModal');
const { HistoryModal } = require('./pages/HistoryModal');
const { StatsModal }   = require('./pages/StatsModal');
const { SpotifyPanel } = require('./pages/SpotifyPanel');
const { LandingPage }  = require('./pages/LandingPage');
const { NavBar }       = require('./pages/NavBar');
const { PendingPage }  = require('./pages/PendingPage');
const { AdminPage }    = require('./pages/AdminPage');

// Mock Spotify API response used across Spotify tests.
// Two playlists so we can also test the options row when needed.
const MOCK_PLAYLISTS = {
  playlists: [
    { embedUrl: 'https://open.spotify.com/embed/playlist/MOCK001?utm_source=generator&theme=0', name: 'Mock Board Game Music' },
    { embedUrl: 'https://open.spotify.com/embed/playlist/MOCK002?utm_source=generator&theme=0', name: 'Mock Chill Tunes' },
  ],
};

// Default game library used by the /api/games mock in beforeEach.
// Includes Low-complexity games (for filter tests) and Wingspan Asia (for 'wing' search test).
const DEFAULT_TEST_GAMES = [
  { id: 1, name: 'Wingspan Asia', type: 'Board', complexity: 'Medium', minPlayers: 1, maxPlayers: 2, playTime: 70, age: 14, setupTime: 10, rating: null, played: false, cooperative: false, thumbnail: null, bggId: 366161, source: 'bgg', spotifyEmbedUrl: null, spotifyPlaylistName: null },
  { id: 2, name: 'Azul', type: 'Board', complexity: 'Medium', minPlayers: 2, maxPlayers: 4, playTime: 45, age: 8, setupTime: 5, rating: null, played: true, cooperative: false, thumbnail: null, bggId: 230802, source: 'bgg', spotifyEmbedUrl: null, spotifyPlaylistName: null },
  { id: 3, name: 'Catan', type: 'Board', complexity: 'Medium', minPlayers: 3, maxPlayers: 6, playTime: 90, age: 10, setupTime: 10, rating: null, played: true, cooperative: false, thumbnail: null, bggId: 13, source: 'bgg', spotifyEmbedUrl: null, spotifyPlaylistName: null },
  { id: 4, name: 'Codenames', type: 'Party', complexity: 'Low', minPlayers: 2, maxPlayers: 8, playTime: 15, age: 14, setupTime: 2, rating: null, played: true, cooperative: false, thumbnail: null, bggId: 178900, source: 'bgg', spotifyEmbedUrl: null, spotifyPlaylistName: null },
  { id: 5, name: 'Fluxx', type: 'Card', complexity: 'Low', minPlayers: 2, maxPlayers: 6, playTime: 30, age: 8, setupTime: 1, rating: null, played: true, cooperative: false, thumbnail: null, bggId: 258, source: 'bgg', spotifyEmbedUrl: null, spotifyPlaylistName: null },
];

// Each test gets a fresh localStorage so state doesn't bleed between runs.
// /api/players and /api/games are mocked so tests never hit the real database.
// Both mocks are stateful within each test -- state resets between tests because
// the mock arrays are declared in the beforeEach closure.
test.beforeEach(async ({ page }) => {
  let mockPlayers = [];
  let nextId = 1;

  await page.route(url => url.href.includes('/api/players'), async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const idSegment = url.match(/\/api\/players\/(\d+)/)?.[1];

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlayers) });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      const player = { id: nextId++, name: body.name, emoji: body.emoji ?? null, color: body.color ?? '#52a8e0', last_played: null };
      mockPlayers.push(player);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(player) });
    } else if (method === 'PUT' && idSegment) {
      const id = parseInt(idSegment);
      const body = route.request().postDataJSON();
      const idx = mockPlayers.findIndex(p => p.id === id);
      if (idx !== -1) mockPlayers[idx] = { ...mockPlayers[idx], ...body };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlayers[idx] ?? {}) });
    } else if (method === 'DELETE' && idSegment) {
      const id = parseInt(idSegment);
      mockPlayers = mockPlayers.filter(p => p.id !== id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  let mockGames = DEFAULT_TEST_GAMES.map(g => ({ ...g }));
  let nextGameId = DEFAULT_TEST_GAMES.length + 1;

  await page.route(url => url.href.includes('/api/games'), async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const idSegment = url.match(/\/api\/games\/(\d+)/)?.[1];
    const isSync = url.includes('/api/games/sync');

    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGames) });
    } else if (method === 'POST' && isSync) {
      const arr = route.request().postDataJSON();
      mockGames = arr.map(g => ({ ...g, id: g.id ?? nextGameId++ }));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGames) });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      const game = { ...body, id: nextGameId++ };
      mockGames.push(game);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(game) });
    } else if (method === 'PUT' && idSegment) {
      const id = parseInt(idSegment);
      const body = route.request().postDataJSON();
      const idx = mockGames.findIndex(g => g.id === id);
      if (idx !== -1) mockGames[idx] = { ...mockGames[idx], ...body };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGames[idx] ?? {}) });
    } else if (method === 'DELETE' && idSegment) {
      const id = parseInt(idSegment);
      mockGames = mockGames.filter(g => g.id !== id);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  let mockHistory = [];

  await page.route(url => url.href.includes('/api/history'), async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const isSync = url.includes('/api/history/sync');

    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockHistory) });
    } else if (method === 'POST' && isSync) {
      const arr = route.request().postDataJSON();
      mockHistory = [...arr, ...mockHistory];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: arr.length }) });
    } else if (method === 'POST') {
      const entry = route.request().postDataJSON();
      mockHistory.unshift(entry);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  let mockActiveSessions = [];

  await page.route(url => url.href.includes('/api/sessions/active'), async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const idSegment = url.match(/\/api\/sessions\/active\/([^/?]+)/)?.[1];

    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockActiveSessions) });
    } else if (method === 'PUT') {
      const state = route.request().postDataJSON();
      const idx = mockActiveSessions.findIndex(s => s.id === state.id);
      if (idx >= 0) mockActiveSessions[idx] = state;
      else mockActiveSessions.push(state);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    } else if (method === 'DELETE' && idSegment) {
      mockActiveSessions = mockActiveSessions.filter(s => s.id !== idSegment);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
});

// ── Page load ──────────────────────────────────────────────────────────────
test('loads with correct title and desktop nav items', async ({ page }) => {
  const main = new MainPage(page);
  await expect(page).toHaveTitle('Session Zero');
  await expect(page.getByRole('heading', { name: 'Session Zero' })).toBeVisible();
  await expect(main.navHome).toBeVisible();
  await expect(main.navLibrary).toBeVisible();
  await expect(main.navHistory).toBeVisible();
  await expect(main.navProfile).toBeVisible();
});

// ── Player Vault ───────────────────────────────────────────────────────────
test('can add and remove a player from the vault', async ({ page }) => {
  const vault = new VaultModal(page);
  await vault.open();
  await vault.addPlayer('Alice');
  await vault.expectPlayer('Alice');
  await vault.removePlayer('Alice');
  await vault.expectNoPlayer('Alice');
});

test('rejects duplicate player names', async ({ page }) => {
  const vault = new VaultModal(page);
  await vault.open();
  await vault.addPlayer('Bob');
  await vault.addPlayer('bob'); // duplicate — different case
  await expect(vault.list.getByTestId('vault-player').filter({ hasText: 'Bob' })).toHaveCount(1);
});

test('adding a player to the vault persists after reload', async ({ page }) => {
  // The beforeEach mock is stateful: POST adds Alice to mockPlayers, so the next
  // GET (on reload) returns her. Clearing localStorage proves the data came from
  // the API mock and not localStorage.
  const vault = new VaultModal(page);
  await vault.open();
  await vault.addPlayer('Alice');
  await vault.expectPlayer('Alice');

  await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  await vault.open();
  await vault.expectPlayer('Alice');
});

test('deleting a player from the vault persists after reload', async ({ page }) => {
  // Seed the mock with Bob pre-loaded so we can test that deletion removes him
  // from the API state, not just from the in-memory vault.
  let mockPlayers = [{ id: 99, name: 'Bob', emoji: null, color: '#52a8e0', last_played: null }];

  await page.route(url => url.href.includes('/api/players'), async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const idSegment = url.match(/\/api\/players\/(\d+)/)?.[1];

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlayers) });
    } else if (method === 'DELETE' && idSegment) {
      const id = parseInt(idSegment);
      mockPlayers = mockPlayers.filter(p => p.id !== id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  const vault = new VaultModal(page);
  await vault.open();
  await vault.expectPlayer('Bob');

  await vault.removePlayer('Bob');
  await vault.expectNoPlayer('Bob');

  await page.waitForLoadState('networkidle');
  await page.reload();
  await page.waitForLoadState('networkidle');

  await vault.open();
  await vault.expectNoPlayer('Bob');
});

// ── Roll Call ──────────────────────────────────────────────────────────────
test('toggling a player on roll call updates the player count filter', async ({ page }) => {
  const vault = new VaultModal(page);
  const main  = new MainPage(page);

  await vault.open();
  await vault.addPlayer('Carol');
  await vault.close();

  const chip = main.rollCallChip('Carol');
  await chip.click();
  await expect(chip).toHaveClass(/active/);
  await expect(main.playersInput).toHaveValue('1');

  await chip.click();
  await expect(chip).not.toHaveClass(/active/);
});

// ── Find Games / Filters ───────────────────────────────────────────────────
test('Find Games shows results from library', async ({ page }) => {
  const main = new MainPage(page);
  await main.findGames();
  await main.expectResults();
  await expect(main.gameCards()).not.toHaveCount(0);
});

test('filtering by player count narrows results', async ({ page }) => {
  const main = new MainPage(page);
  await main.findGames();
  const allCount = await main.gameCards().count();

  await main.setPlayers(2);
  await main.findGames();
  await main.expectResults();
  const filteredCount = await main.gameCards().count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(allCount);
});

test('filtering by complexity narrows results and all badges match', async ({ page }) => {
  const main = new MainPage(page);
  await main.setComplexity('Low');
  await main.findGames();
  await main.expectResults();
  const count = await main.gameCards().count();
  expect(count).toBeGreaterThan(0);
  const badges = await page.locator('[data-testid="game-list"] .badge-low').count();
  expect(badges).toBe(count);
});

test('no-results message shown when filters match nothing', async ({ page }) => {
  const main = new MainPage(page);
  await main.setPlayers(99);
  await main.findGames();
  await main.expectNoResults();
});

test('Surprise Me shows exactly 1 game', async ({ page }) => {
  const main = new MainPage(page);
  await main.surpriseMe();
  await main.expectResults();
  await expect(main.gameCards()).toHaveCount(1);
});

// ── Quick Search ───────────────────────────────────────────────────────────
test('quick search filters visible games', async ({ page }) => {
  const main = new MainPage(page);
  await main.findGames();
  const totalBefore = await main.gameCards().count();

  await main.search('wing');
  const afterCount = await main.gameCards().count();
  expect(afterCount).toBeGreaterThan(0);
  expect(afterCount).toBeLessThan(totalBefore);

  const names = await page.getByTestId('game-name').allTextContents();
  for (const name of names) {
    expect(name.toLowerCase()).toContain('wing');
  }
});

// ── BGG badge on game cards ────────────────────────────────────────────────
test('expanded game card shows BGG badge linking to boardgamegeek.com for a BGG game', async ({ page }) => {
  const main    = new MainPage(page);
  const library = new LibraryModal(page);

  await library.seedGames([
    { id: 101, name: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, playTime: 60,
      complexity: 'Low', type: 'Board', age: 8, setupTime: 10, rating: 4,
      played: false, cooperative: false, thumbnail: null, bggId: 9209, source: 'bgg',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await main.findGames();
  await main.expandGameCard(0);

  const badge = main.gameCards().nth(0).getByTestId('bgg-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('href', 'https://boardgamegeek.com/boardgame/9209');
  await expect(badge).toHaveAttribute('target', '_blank');
});

test('expanded game card shows BGG badge linking to Google search for a manual game', async ({ page }) => {
  const main    = new MainPage(page);
  const library = new LibraryModal(page);

  await library.seedGames([
    { id: 102, name: 'My Homebrew Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
      complexity: 'Low', type: 'Card', age: 0, setupTime: 5, rating: null,
      played: false, cooperative: false, thumbnail: null, bggId: null, source: 'manual',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await main.findGames();
  await main.expandGameCard(0);

  const badge = main.gameCards().nth(0).getByTestId('bgg-badge');
  await expect(badge).toBeVisible();
  const href = await badge.getAttribute('href');
  expect(href).toContain('google.com/search');
  expect(href).toContain('My%20Homebrew%20Game');
});

// ── Session Modal ──────────────────────────────────────────────────────────
test("Let's Play opens session modal with game title", async ({ page }) => {
  const main    = new MainPage(page);
  const session = new SessionModal(page);

  await main.findGames();
  await main.letsPlay(0);

  await session.expectOpen();
  await expect(session.title).not.toBeEmpty();
});

test('timer starts and pauses', async ({ page }) => {
  const main    = new MainPage(page);
  const session = new SessionModal(page);

  await main.findGames();
  await main.letsPlay(0);

  await session.startTimer();
  await page.waitForTimeout(1200);
  const display = await session.timerDisplay.textContent();
  expect(display).not.toBe('0:00:00');

  await session.pauseTimer();
  const frozen = await session.timerDisplay.textContent();
  await page.waitForTimeout(600);
  await expect(session.timerDisplay).toHaveText(frozen);
});

// ── Game Library ───────────────────────────────────────────────────────────
test('library shows loaded games and correct count', async ({ page }) => {
  const library = new LibraryModal(page);
  await library.open();
  await expect(library.count).toHaveText(/\d+ of \d+ games?/);
  await expect(library.rows().first()).toBeVisible();
});

test('library search filters rows', async ({ page }) => {
  const library = new LibraryModal(page);
  await library.open();
  const totalRows = await library.rows().count();

  await library.search('wingspan');
  const filtered = await library.rows().count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(totalRows);
});

test('can add a game manually in the library', async ({ page }) => {
  const library = new LibraryModal(page);
  await library.open();
  await library.addGame({ name: 'Test Game XYZ', minPlayers: '2', maxPlayers: '4', playtime: '45' });
  await library.expectGame('Test Game XYZ');
});

test('can delete a game from the library', async ({ page }) => {
  const library = new LibraryModal(page);
  await library.open();
  await library.addGame({ name: 'DeleteMe Game' });

  page.on('dialog', d => d.accept());
  await library.deleteGame('DeleteMe Game');
  await library.expectNoGame('DeleteMe Game');
});

// ── Settings ───────────────────────────────────────────────────────────────
test('settings modal opens and Why? toggle works', async ({ page }) => {
  const settings = new SettingsModal(page);
  const main     = new MainPage(page);

  await settings.open();
  await settings.expectWhyBtnOn();

  await settings.toggleWhyBtn();
  await settings.expectWhyBtnOff();
  await settings.close();

  // Why? buttons on game cards should now be hidden
  await main.findGames();
  await expect(page.getByTestId('why-btn').first()).toBeHidden();
});

test('Why? toggle setting persists across page reload', async ({ page }) => {
  const settings = new SettingsModal(page);
  const main     = new MainPage(page);

  let savedShowWhyBtn = true;

  // Mock GET to return current value; mock PUT to capture what was saved
  await settings.mockSettings(async route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      savedShowWhyBtn = body.showWhyBtn;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ showWhyBtn: savedShowWhyBtn, bggUsername: null, bggLastSync: null, bggLastSyncCount: null }),
    });
  });

  await page.reload();
  await settings.open();
  await settings.expectWhyBtnOn();

  await settings.toggleWhyBtn();
  await settings.expectWhyBtnOff();
  await settings.close();

  expect(savedShowWhyBtn).toBe(false);

  // Reload - mock now returns the saved value of false
  await page.reload();
  await settings.open();
  await settings.expectWhyBtnOff();

  // Game cards should still hide the Why? button after reload
  await settings.close();
  await main.findGames();
  await expect(page.getByTestId('why-btn').first()).toBeHidden();
});

// ── BGG Sync (merge behavior) ──────────────────────────────────────────────
// All tests mock /api/bgg/collection via page.route() - no live BGG API calls.

test('BGG sync preserves manually added games not in BGG response', async ({ page }) => {
  const settings = new SettingsModal(page);
  const library  = new LibraryModal(page);

  await library.seedGames([
    { id: 201, name: 'My Homebrew Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
      complexity: 'Low', type: 'Card', age: 0, setupTime: 5, rating: null,
      played: false, cooperative: false, thumbnail: null, bggId: null, source: 'manual',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await settings.mockAndSync(route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ games: [], count: 0 }) })
  );

  await settings.expectSyncError('No owned games found');
  await settings.close();
  await library.open();
  await library.expectGame('My Homebrew Game');
});

test('BGG sync updates fields on an existing BGG game matched by bggId', async ({ page }) => {
  const settings = new SettingsModal(page);
  const library  = new LibraryModal(page);

  await library.seedGames([
    { id: 202, name: 'Old Name', minPlayers: 2, maxPlayers: 4, playTime: 60,
      complexity: 'Medium', type: 'Board', age: 0, setupTime: 10, rating: 3,
      played: true, cooperative: false, thumbnail: null, bggId: 12345, source: 'bgg',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await settings.mockAndSync(route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        games: [{ name: 'New Name', minPlayers: 2, maxPlayers: 5, playTime: 90,
                  complexity: 'Medium', type: 'Board', age: 0, setupTime: 10,
                  rating: null, played: false, cooperative: false, thumbnail: null, bggId: 12345 }],
        count: 1,
      }),
    })
  );

  await settings.expectSyncSuccess('Synced 1');
  await settings.close();
  await library.open();
  await library.expectGame('New Name');
  await library.expectNoGame('Old Name');
});

test('BGG sync adds new games from BGG not yet in the local library', async ({ page }) => {
  const settings = new SettingsModal(page);
  const library  = new LibraryModal(page);

  await library.seedGames([]);

  await settings.mockAndSync(route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        games: [{ name: 'Brand New Game', minPlayers: 2, maxPlayers: 4, playTime: 45,
                  complexity: 'Low', type: 'Board', age: 8, setupTime: 5,
                  rating: null, played: false, cooperative: false, thumbnail: null, bggId: 99999 }],
        count: 1,
      }),
    })
  );

  await settings.expectSyncSuccess('Synced 1');
  await settings.close();
  await library.open();
  await library.expectGame('Brand New Game');
});

test('BGG sync backfills bggId on a name-matched manual game so badge links to BGG', async ({ page }) => {
  const settings = new SettingsModal(page);
  const main     = new MainPage(page);
  const library  = new LibraryModal(page);

  await library.seedGames([
    { id: 204, name: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, playTime: 60,
      complexity: 'Low', type: 'Board', age: 8, setupTime: 10, rating: 4,
      played: false, cooperative: false, thumbnail: null, bggId: null, source: 'manual',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await settings.mockAndSync(route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        games: [{ name: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, playTime: 60,
                  complexity: 'Low', type: 'Board', age: 8, setupTime: 10,
                  rating: null, played: false, cooperative: false, thumbnail: null, bggId: 9209 }],
        count: 1,
      }),
    })
  );

  await settings.expectSyncSuccess('Synced 1');
  await settings.close();
  await main.findGames();
  await main.expandGameCard(0);

  const badge = main.gameCards().nth(0).getByTestId('bgg-badge');
  await expect(badge).toHaveAttribute('href', 'https://boardgamegeek.com/boardgame/9209');
});

test('BGG sync shows error message on server failure', async ({ page }) => {
  const settings = new SettingsModal(page);

  await settings.mockAndSync(route =>
    route.fulfill({ status: 500, contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal server error' }) })
  );

  await settings.expectSyncError();
});

test('BGG sync preserves existing games when BGG returns empty collection', async ({ page }) => {
  const settings = new SettingsModal(page);
  const library  = new LibraryModal(page);

  await library.seedGames([
    { id: 205, name: 'Keeper Game', minPlayers: 2, maxPlayers: 4, playTime: 60,
      complexity: 'Medium', type: 'Board', age: 0, setupTime: 10, rating: null,
      played: false, cooperative: false, thumbnail: null, bggId: 77777, source: 'bgg',
      spotifyEmbedUrl: null, spotifyPlaylistName: null },
  ]);

  await settings.mockAndSync(route =>
    route.fulfill({ contentType: 'application/json',
                    body: JSON.stringify({ games: [], count: 0 }) })
  );

  await settings.expectSyncError('No owned games found');
  await settings.close();
  await library.open();
  await library.expectGame('Keeper Game');
});

// ── Games import prompt ────────────────────────────────────────────────────
test('import prompt appears when localStorage has games and API returns empty library', async ({ page }) => {
  await page.route(url => url.href.includes('/api/games'), async route => {
    if (route.request().method() === 'GET' && !route.request().url().includes('/sync')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Old Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
        complexity: 'Low', type: 'Card', age: 0, setupTime: 5,
        rating: null, played: false, cooperative: false, thumbnail: null,
        bggId: null, source: 'manual' },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await expect(main.gamesImportPrompt).toBeVisible();
});

test('importing local games calls sync endpoint and dismisses prompt', async ({ page }) => {
  let syncCalled = false;

  await page.route(url => url.href.includes('/api/games'), async route => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === 'GET' && !url.includes('/sync')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (method === 'POST' && url.includes('/sync')) {
      syncCalled = true;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 1, name: 'Old Game', type: 'Card', complexity: 'Low', minPlayers: 2, maxPlayers: 4,
          playTime: 30, age: 0, setupTime: 5, rating: null, played: false, cooperative: false,
          thumbnail: null, bggId: null, source: 'manual', spotifyEmbedUrl: null, spotifyPlaylistName: null },
      ]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Old Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
        complexity: 'Low', type: 'Card', age: 0, setupTime: 5,
        rating: null, played: false, cooperative: false, thumbnail: null,
        bggId: null, source: 'manual' },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.gamesImportYes.click();
  await page.waitForLoadState('networkidle');

  expect(syncCalled).toBe(true);
  await expect(main.gamesImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-games'));
  expect(stored).toBeNull();
});

test('dismissing import prompt removes localStorage entry', async ({ page }) => {
  await page.route(url => url.href.includes('/api/games'), async route => {
    if (route.request().method() === 'GET' && !route.request().url().includes('/sync')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Old Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
        complexity: 'Low', type: 'Card', age: 0, setupTime: 5,
        rating: null, played: false, cooperative: false, thumbnail: null,
        bggId: null, source: 'manual' },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.gamesImportNo.click();

  await expect(main.gamesImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-games'));
  expect(stored).toBeNull();
});

// ── History import prompt ──────────────────────────────────────────────────
test('history import prompt appears when localStorage has history and API returns empty', async ({ page }) => {
  await page.route(url => url.href.includes('/api/history'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-history', JSON.stringify([
      { id: 'h1', date: '2025-01-01', game: 'Azul', mode: 'scores', lowScoreWins: false,
        timerSeconds: 1800, players: [], feedback: {} },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await expect(main.historyImportPrompt).toBeVisible();
});

test('importing local history calls sync endpoint and dismisses prompt', async ({ page }) => {
  let syncCalled = false;

  await page.route(url => url.href.includes('/api/history'), async route => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (method === 'POST' && url.includes('/sync')) {
      syncCalled = true;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: 1 }) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-history', JSON.stringify([
      { id: 'h1', date: '2025-01-01', game: 'Azul', mode: 'scores', lowScoreWins: false,
        timerSeconds: 1800, players: [], feedback: {} },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.historyImportYes.click();
  await page.waitForLoadState('networkidle');

  expect(syncCalled).toBe(true);
  await expect(main.historyImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-history'));
  expect(stored).toBeNull();
});

test('dismissing history import prompt removes localStorage entry', async ({ page }) => {
  await page.route(url => url.href.includes('/api/history'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-history', JSON.stringify([
      { id: 'h1', date: '2025-01-01', game: 'Azul', mode: 'scores', lowScoreWins: false,
        timerSeconds: 1800, players: [], feedback: {} },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.historyImportNo.click();

  await expect(main.historyImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-history'));
  expect(stored).toBeNull();
});

// ── Active sessions import prompt ──────────────────────────────────────────
test('active sessions import prompt appears when localStorage has paused session', async ({ page }) => {
  await page.route(url => url.href.includes('/api/sessions/active'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-active-sessions', JSON.stringify([
      { id: 'sess-1', game: { id: 1, name: 'Azul' }, players: [], scores: {},
        scoreMode: 'scores', lowScoreWins: false, outcome: null,
        timerSeconds: 300, pausedAt: new Date().toISOString() },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await expect(main.activeSessionsImportPrompt).toBeVisible();
});

test('importing local active sessions calls PUT endpoint and dismisses prompt', async ({ page }) => {
  let putCalled = false;

  await page.route(url => url.href.includes('/api/sessions/active'), async route => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (method === 'PUT') {
      putCalled = true;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-active-sessions', JSON.stringify([
      { id: 'sess-1', game: { id: 1, name: 'Azul' }, players: [], scores: {},
        scoreMode: 'scores', lowScoreWins: false, outcome: null,
        timerSeconds: 300, pausedAt: new Date().toISOString() },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.activeSessionsImportYes.click();
  await page.waitForLoadState('networkidle');

  expect(putCalled).toBe(true);
  await expect(main.activeSessionsImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-active-sessions'));
  expect(stored).toBeNull();
});

test('dismissing active sessions import prompt removes localStorage entry', async ({ page }) => {
  await page.route(url => url.href.includes('/api/sessions/active'), async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fallback();
  });
  await page.evaluate(() => {
    localStorage.setItem('sz-active-sessions', JSON.stringify([
      { id: 'sess-1', game: { id: 1, name: 'Azul' }, players: [], scores: {},
        scoreMode: 'scores', lowScoreWins: false, outcome: null,
        timerSeconds: 300, pausedAt: new Date().toISOString() },
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.activeSessionsImportNo.click();

  await expect(main.activeSessionsImportPrompt).not.toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('sz-active-sessions'));
  expect(stored).toBeNull();
});

// ── History ────────────────────────────────────────────────────────────────
test('history modal opens and list renders', async ({ page }) => {
  const history = new HistoryModal(page);
  await history.open();
  await expect(history.list).toBeVisible();
});

test('history shows empty state when no sessions recorded', async ({ page }) => {
  const history = new HistoryModal(page);
  await history.open();
  await expect(history.list).toContainText('No sessions recorded yet.');
});

test('finalized session appears in history list', async ({ page }) => {
  const main    = new MainPage(page);
  const session = new SessionModal(page);
  const history = new HistoryModal(page);

  await main.findGames();
  const gameName = await main.gameCards().nth(0).getByTestId('game-name').textContent();
  await main.letsPlay(0);
  await session.finalize();

  await history.open();
  await expect(history.card(gameName)).toBeVisible();
});

test('paused session appears in Games in Progress', async ({ page }) => {
  const main    = new MainPage(page);
  const session = new SessionModal(page);

  await main.findGames();
  const gameName = await main.gameCards().nth(0).getByTestId('game-name').textContent();
  await main.letsPlay(0);

  await session.pauseBtn.click();
  await expect(session.modal).not.toHaveClass(/active/);

  const gip = page.locator('.gip-game');
  await expect(gip).toBeVisible();
  await expect(gip).toContainText(gameName);
});

test('resumed session restores game title', async ({ page }) => {
  const main    = new MainPage(page);
  const session = new SessionModal(page);

  await main.findGames();
  const gameName = await main.gameCards().nth(0).getByTestId('game-name').textContent();
  await main.letsPlay(0);
  await session.pauseBtn.click();

  const resumeBtn = page.locator('.resume-btn').first();
  await expect(resumeBtn).toBeVisible();
  await resumeBtn.click();

  await session.expectOpen();
  await session.expectTitle(gameName);
});

// ── Stats ──────────────────────────────────────────────────────────────────
test('stats modal tab switcher works', async ({ page }) => {
  const stats = new StatsModal(page);
  await stats.open();
  await expect(stats.tabPlayers).toBeVisible();
  await expect(stats.tabH2H).toBeVisible();

  await stats.switchToH2H();
  await stats.switchToPlayers();
});

// ── Spotify ─────────────────────────────────────────────────────────────────
// All Spotify tests mock /api/spotify/playlist at the network level using
// page.route() — no live Spotify API calls are made during any test run.

test('Spotify embed appears in session dashboard when a game is selected', async ({ page }) => {
  await page.route('/api/spotify/playlist*', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_PLAYLISTS) })
  );

  const main    = new MainPage(page);
  const spotify = new SpotifyPanel(page);

  await main.findGames();
  await main.letsPlay(0);

  await spotify.waitForEmbed();
  await expect(spotify.iframe).toHaveAttribute('src', /open\.spotify\.com\/embed/);
});

test('auto-search sends game name and type as query params, not a manual query', async ({ page }) => {
  const requestPromise = page.waitForRequest(/\/api\/spotify\/playlist/);

  await page.route('/api/spotify/playlist*', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_PLAYLISTS) })
  );

  const main = new MainPage(page);
  await main.findGames();
  await main.letsPlay(0);

  const request = await requestPromise;
  const url     = new URL(request.url());

  expect(url.searchParams.get('game')).toBeTruthy();
  expect(url.searchParams.get('type')).toBeTruthy();
  expect(url.searchParams.has('query')).toBe(false);
});

test('manual search override updates the embed and sends query param', async ({ page }) => {
  await page.route('/api/spotify/playlist*', (route, request) => {
    const url = new URL(request.url());
    if (url.searchParams.has('query')) {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          playlists: [{ embedUrl: 'https://open.spotify.com/embed/playlist/OVERRIDE?utm_source=generator&theme=0', name: 'Custom Result' }],
        }),
      });
    } else {
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_PLAYLISTS) });
    }
  });

  const main    = new MainPage(page);
  const spotify = new SpotifyPanel(page);

  await main.findGames();
  await main.letsPlay(0);
  await spotify.waitForEmbed();

  await spotify.openSearch();

  const overrideRequest = page.waitForRequest(req => req.url().includes('/api/spotify/playlist') && req.url().includes('query='));
  await spotify.searchFor('catan ambient');

  const req = await overrideRequest;
  const url = new URL(req.url());
  expect(url.searchParams.get('query')).toBe('catan ambient');

  await expect(spotify.iframe).toHaveAttribute('src', /OVERRIDE/);
});

test('saved playlist is restored on session resume without a new API call', async ({ page }) => {
  let callCount = 0;
  await page.route('/api/spotify/playlist*', route => {
    callCount++;
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_PLAYLISTS) });
  });

  const main    = new MainPage(page);
  const session = new SessionModal(page);
  const spotify = new SpotifyPanel(page);

  await main.findGames();
  await main.letsPlay(0);
  await spotify.waitForEmbed();
  expect(callCount).toBe(1);

  await spotify.save();
  await expect(spotify.saveBtn).toHaveClass(/saved/);

  // Pause the session
  await session.pauseBtn.click();
  await expect(session.modal).not.toHaveClass(/active/);

  // Resume via Games in Progress
  const resumeBtn = page.locator('.resume-btn').first();
  await expect(resumeBtn).toBeVisible();
  await resumeBtn.click();

  // Embed should reload from saved URL — no new API call
  await spotify.waitForEmbed();
  expect(callCount).toBe(1);
  await expect(spotify.saveBtn).toHaveClass(/saved/);
});

test('shows no-result message and search input when Spotify returns no playlists', async ({ page }) => {
  await page.route('/api/spotify/playlist*', route =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'No playlist found' }) })
  );

  const main    = new MainPage(page);
  const spotify = new SpotifyPanel(page);

  await main.findGames();
  await main.letsPlay(0);

  await expect(spotify.noResult).toBeVisible();
  await expect(spotify.searchRow).toBeVisible();
  await expect(spotify.iframe).not.toBeAttached();
});

// ── Landing Page ───────────────────────────────────────────────────────────
test('landing page shows Try the Demo and Sign in with Google buttons', async ({ page }) => {
  const landing = new LandingPage(page);
  await landing.goto();
  await expect(landing.heading).toBeVisible();
  await expect(landing.tagline).toBeVisible();
  await expect(landing.demoBtnLink).toBeVisible();
  await expect(landing.demoBtnLink).toHaveAttribute('href', '/demo');
  await expect(landing.googleSigninLink).toBeVisible();
  await expect(landing.googleSigninLink).toHaveAttribute('href', '/auth/google');
});

// ── Demo Mode ──────────────────────────────────────────────────────────────
test('demo mode shows sticky banner and sign-in button', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('demo-banner-signin')).toBeVisible();
});

test('demo mode pre-loads four fictional players in the vault', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  const vault = new VaultModal(page);
  await vault.open();

  await vault.expectPlayer('Colonel Mustard');
  await vault.expectPlayer('Miss Scarlett');
  await vault.expectPlayer('Mrs. Peacock');
  await vault.expectPlayer('Professor Plum');
});

test('demo mode loads games from demo-games.json', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  // Open the library modal to see all loaded games without the 5-game random cap
  const library = new LibraryModal(page);
  await library.open();

  // demo-games.json has exactly 10 games
  await expect(page.getByTestId('library-count')).toContainText('10');

  // Spot-check a game unique to demo-games.json
  await expect(page.getByTestId('library-list')).toContainText('Codenames');
});

test('demo mode Why? button returns mock response without calling Anthropic', async ({ page }) => {
  let anthropicCalled = false;
  await page.route('/api/why', async (route) => {
    const body = route.request().postDataJSON();
    if (body.demo !== true) {
      anthropicCalled = true;
    }
    // Let the request proceed to the server -- it will return the demo response
    await route.continue();
  });

  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  const main = new MainPage(page);
  await main.findGames();

  // Click Why? on the first result
  const whyBtn = page.getByTestId('game-list').locator('.why-btn').first();
  await whyBtn.click();
  await page.waitForSelector('.why-text:not(.hidden)');

  const whyText = page.locator('.why-text').first();
  await expect(whyText).not.toBeEmpty();
  expect(anthropicCalled).toBe(false);
});

test('demo mode does not write to localStorage', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  // Open vault and attempt to add a player -- should not persist to localStorage
  const vault = new VaultModal(page);
  await vault.open();
  await vault.addPlayer('TestUser');

  const stored = await page.evaluate(() => localStorage.getItem('sz-vault'));
  expect(stored).toBeNull();
});

test('demo mode sign-in link points to Google auth', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');

  const bannerSignin = page.getByTestId('demo-banner-signin');
  await expect(bannerSignin).toHaveAttribute('href', '/auth/google');
});

// ── Navigation ─────────────────────────────────────────────────────────────
test('desktop nav shows four items at 768px and above', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const nav = new NavBar(page);
  await nav.expectDesktopNavVisible();
  await expect(nav.navHome).toBeVisible();
  await expect(nav.navLibrary).toBeVisible();
  await expect(nav.navHistory).toBeVisible();
  await expect(nav.navProfile).toBeVisible();
});

test('mobile nav shows four items below 768px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const nav = new NavBar(page);
  await nav.expectMobileNavVisible();
  await expect(nav.mobileNavHome).toBeVisible();
  await expect(nav.mobileNavLibrary).toBeVisible();
  await expect(nav.mobileNavHistory).toBeVisible();
  await expect(nav.mobileNavProfile).toBeVisible();
});

test('clicking Library nav opens the library section', async ({ page }) => {
  const nav     = new NavBar(page);
  const library = new LibraryModal(page);
  await library.open();
  await expect(library.modal).toHaveClass(/active/);
  await nav.expectActiveNav('library');
});

test('clicking History nav opens the history section', async ({ page }) => {
  const nav     = new NavBar(page);
  const history = new HistoryModal(page);
  await history.open();
  await expect(history.modal).toHaveClass(/active/);
  await nav.expectActiveNav('history');
});

test('clicking Profile nav opens the profile section', async ({ page }) => {
  const nav  = new NavBar(page);
  const vault = new VaultModal(page);
  await vault.open();
  await expect(vault.modal).toHaveClass(/active/);
  await nav.expectActiveNav('profile');
});

test('Home nav closes open section and resets active state', async ({ page }) => {
  // Mobile nav (z-index 200) is intentionally above modal overlays (z-index 100)
  // so the Home button is always reachable even when a section is open.
  await page.setViewportSize({ width: 375, height: 812 });
  const nav     = new NavBar(page);
  const history = new HistoryModal(page);

  // Open history via mobile nav
  await nav.mobileNavHistory.click();
  await expect(history.modal).toHaveClass(/active/);

  // Click Home on the mobile nav -- should close the section
  await nav.mobileNavHome.click();
  await expect(history.modal).not.toHaveClass(/active/);
});

// ── Pending page ───────────────────────────────────────────────────────────

test('pending page shows account pending message', async ({ page }) => {
  const pending = new PendingPage(page);
  await pending.goto();
  await pending.expectMessage();
});

// ── Admin nav ──────────────────────────────────────────────────────────────

test('admin nav item is visible for admin users', async ({ page }) => {
  const nav = new NavBar(page);
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ display_name: 'Admin', email: 'admin@test.com', avatar_url: null, role: 'admin' }),
  }));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(nav.navAdmin).toBeVisible();
});

test('admin nav item is not visible for regular users', async ({ page }) => {
  const nav = new NavBar(page);
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ display_name: 'User', email: 'user@test.com', avatar_url: null, role: 'user' }),
  }));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(nav.navAdmin).not.toBeVisible();
});

test('admin nav item is not visible when role is absent', async ({ page }) => {
  const nav = new NavBar(page);
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ display_name: 'User', email: 'user@test.com', avatar_url: null }),
  }));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(nav.navAdmin).not.toBeVisible();
});

// ── Admin panel ─────────────────────────────────────────────────────────────

const MOCK_ADMIN_USER = { id: 1, email: 'admin@test.com', display_name: 'Admin', role: 'admin', approved: true, ai_enabled: true, ai_daily_limit: 20 };
const MOCK_PENDING_USER = { id: 2, email: 'pending@test.com', display_name: 'Pending User', role: 'user', approved: false, ai_enabled: true, ai_daily_limit: 20 };
const MOCK_ACTIVE_USER  = { id: 3, email: 'active@test.com',  display_name: 'Active User',  role: 'user', approved: true,  ai_enabled: true, ai_daily_limit: 20 };

function mockAdminRoutes(page, { users, meId = 1 } = {}) {
  let mockUsers = users ?? [MOCK_ADMIN_USER, MOCK_PENDING_USER, MOCK_ACTIVE_USER];

  page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: meId, display_name: 'Admin', email: 'admin@test.com', avatar_url: null, role: 'admin' }),
  }));

  page.route(url => url.href.includes('/api/admin/users'), async route => {
    const method = route.request().method();
    const url = route.request().url();
    const approveMatch = url.match(/\/api\/admin\/users\/(\d+)\/approve/);
    const denyMatch    = url.match(/\/api\/admin\/users\/(\d+)\/deny/);
    const revokeMatch  = url.match(/\/api\/admin\/users\/(\d+)\/revoke/);
    const bulkMatch    = url.includes('/api/admin/users/ai-bulk');
    const putMatch     = method === 'PUT' && url.match(/\/api\/admin\/users\/(\d+)$/);

    if (bulkMatch) {
      const { ai_enabled } = route.request().postDataJSON();
      mockUsers = mockUsers.map(u => u.role === 'admin' ? u : { ...u, ai_enabled });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updated: mockUsers.filter(u => u.role !== 'admin').length }) });
    }
    if (approveMatch) {
      const id = parseInt(approveMatch[1]);
      mockUsers = mockUsers.map(u => u.id === id ? { ...u, approved: true } : u);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (denyMatch) {
      const id = parseInt(denyMatch[1]);
      mockUsers = mockUsers.filter(u => u.id !== id);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (revokeMatch) {
      const id = parseInt(revokeMatch[1]);
      mockUsers = mockUsers.map(u => u.id === id ? { ...u, approved: false } : u);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (putMatch) {
      const id = parseInt(putMatch[1]);
      const body = route.request().postDataJSON();
      mockUsers = mockUsers.map(u => u.id === id ? { ...u, ...body } : u);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    // GET /api/admin/users
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUsers) });
  });
}

test('admin panel shows pending and active users', async ({ page }) => {
  mockAdminRoutes(page);
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectPendingUser('pending@test.com');
  await admin.expectActiveUser('active@test.com');
});

test('admin panel shows empty state when no pending users', async ({ page }) => {
  mockAdminRoutes(page, { users: [MOCK_ADMIN_USER, MOCK_ACTIVE_USER] });
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectNoPendingUsers();
  await admin.expectActiveUser('active@test.com');
});

test('approving a pending user moves them to the active list', async ({ page }) => {
  mockAdminRoutes(page);
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectPendingUser('pending@test.com');
  await admin.approvePendingUser('pending@test.com');
  await admin.expectNoPendingUsers();
  await admin.expectActiveUser('pending@test.com');
});

test('denying a pending user removes them from the pending list', async ({ page }) => {
  mockAdminRoutes(page);
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectPendingUser('pending@test.com');
  await admin.denyPendingUser('pending@test.com');
  await admin.expectNoPendingUsers();
});

test('revoking an active user removes them from the active list', async ({ page }) => {
  mockAdminRoutes(page);
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectActiveUser('active@test.com');
  await admin.revokeUser('active@test.com');
  await expect(admin.activeUser('active@test.com')).not.toBeVisible();
});

test('admin cannot revoke their own account', async ({ page }) => {
  mockAdminRoutes(page, { meId: 1 });
  const admin = new AdminPage(page);
  await admin.goto();
  await expect(admin.revokeBtn('admin@test.com')).toBeDisabled();
});

test('admin cannot deny their own pending account', async ({ page }) => {
  const selfPending = { ...MOCK_ADMIN_USER, approved: false };
  mockAdminRoutes(page, { users: [selfPending], meId: 1 });
  const admin = new AdminPage(page);
  await admin.goto();
  await expect(admin.denyBtn('admin@test.com')).toBeDisabled();
});

test('bulk enable AI updates all active users', async ({ page }) => {
  const disabledUser = { ...MOCK_ACTIVE_USER, ai_enabled: false };
  mockAdminRoutes(page, { users: [MOCK_ADMIN_USER, disabledUser] });
  const admin = new AdminPage(page);
  await admin.goto();
  await expect(admin.aiCheckbox('active@test.com')).not.toBeChecked();
  await admin.enableAIAll.click();
  await page.waitForLoadState('networkidle');
  await expect(admin.aiCheckbox('active@test.com')).toBeChecked();
});

test('ai daily limit shows blank for null (unlimited)', async ({ page }) => {
  const unlimitedUser = { ...MOCK_ACTIVE_USER, ai_daily_limit: null };
  mockAdminRoutes(page, { users: [MOCK_ADMIN_USER, unlimitedUser] });
  const admin = new AdminPage(page);
  await admin.goto();
  await expect(admin.aiLimitInput('active@test.com')).toHaveValue('');
});
