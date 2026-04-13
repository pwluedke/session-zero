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

// Mock Spotify API response used across Spotify tests.
// Two playlists so we can also test the options row when needed.
const MOCK_PLAYLISTS = {
  playlists: [
    { embedUrl: 'https://open.spotify.com/embed/playlist/MOCK001?utm_source=generator&theme=0', name: 'Mock Board Game Music' },
    { embedUrl: 'https://open.spotify.com/embed/playlist/MOCK002?utm_source=generator&theme=0', name: 'Mock Chill Tunes' },
  ],
};

// Each test gets a fresh localStorage so state doesn't bleed between runs.
// waitForLoadState('networkidle') ensures games.json fetch completes first.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
});

// ── Page load ──────────────────────────────────────────────────────────────
test('loads with correct title and all header buttons', async ({ page }) => {
  const main = new MainPage(page);
  await expect(page).toHaveTitle('Session Zero');
  await expect(page.getByText('Session Zero: A Game Night Planner')).toBeVisible();
  await expect(main.btnVault).toBeVisible();
  await expect(main.btnLibrary).toBeVisible();
  await expect(main.btnHistory).toBeVisible();
  await expect(main.btnStats).toBeVisible();
  await expect(main.btnSettings).toBeVisible();
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
test('Find Games shows results from games.json', async ({ page }) => {
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
  const main = new MainPage(page);

  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, playTime: 60,
        complexity: 'Low', type: 'Board', age: 8, setupTime: 10, rating: 4,
        played: false, cooperative: false, thumbnail: null, bggId: 9209, source: 'bgg' },
    ]));
  });
  await page.reload();

  await main.findGames();
  await main.expandGameCard(0);

  const badge = main.gameCards().nth(0).getByTestId('bgg-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('href', 'https://boardgamegeek.com/boardgame/9209');
  await expect(badge).toHaveAttribute('target', '_blank');
});

test('expanded game card shows BGG badge linking to Google search for a manual game', async ({ page }) => {
  const main = new MainPage(page);

  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'My Homebrew Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
        complexity: 'Low', type: 'Card', age: 0, setupTime: 5, rating: null,
        played: false, cooperative: false, thumbnail: null, bggId: null, source: 'manual' },
    ]));
  });
  await page.reload();

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

// ── BGG Sync (merge behavior) ──────────────────────────────────────────────
// All tests mock /api/bgg/collection via page.route() - no live BGG API calls.

test('BGG sync preserves manually added games not in BGG response', async ({ page }) => {
  const settings = new SettingsModal(page);
  const library  = new LibraryModal(page);

  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'My Homebrew Game', minPlayers: 2, maxPlayers: 4, playTime: 30,
        complexity: 'Low', type: 'Card', age: 0, setupTime: 5, rating: null,
        played: false, cooperative: false, thumbnail: null, bggId: null, source: 'manual' },
    ]));
  });
  await page.reload();

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

  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Old Name', minPlayers: 2, maxPlayers: 4, playTime: 60,
        complexity: 'Medium', type: 'Board', age: 0, setupTime: 10, rating: 3,
        played: true, cooperative: false, thumbnail: null, bggId: 12345, source: 'bgg' },
    ]));
  });
  await page.reload();

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

  // Start with an empty library (clear any games.json defaults)
  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([]));
  });
  await page.reload();

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

  await page.evaluate(() => {
    localStorage.setItem('sz-games', JSON.stringify([
      { name: 'Keeper Game', minPlayers: 2, maxPlayers: 4, playTime: 60,
        complexity: 'Medium', type: 'Board', age: 0, setupTime: 10, rating: null,
        played: false, cooperative: false, thumbnail: null, bggId: 77777, source: 'bgg' },
    ]));
  });
  await page.reload();

  await settings.mockAndSync(route =>
    route.fulfill({ contentType: 'application/json',
                    body: JSON.stringify({ games: [], count: 0 }) })
  );

  await settings.expectSyncError('No owned games found');
  await settings.close();
  await library.open();
  await library.expectGame('Keeper Game');
});

// ── History ────────────────────────────────────────────────────────────────
test('history modal opens and list renders', async ({ page }) => {
  const history = new HistoryModal(page);
  await history.open();
  await expect(history.list).toBeVisible();
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
  await expect(page.getByTestId('demo-header-signin')).toBeVisible();
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

  const signinBtn = page.getByTestId('demo-header-signin');
  await expect(signinBtn).toHaveAttribute('href', '/auth/google');

  const bannerSignin = page.getByTestId('demo-banner-signin');
  await expect(bannerSignin).toHaveAttribute('href', '/auth/google');
});
