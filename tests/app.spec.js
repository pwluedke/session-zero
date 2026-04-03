const { test, expect } = require('@playwright/test');
const { MainPage }     = require('./pages/MainPage');
const { VaultModal }   = require('./pages/VaultModal');
const { SessionModal } = require('./pages/SessionModal');
const { LibraryModal } = require('./pages/LibraryModal');
const { SettingsModal } = require('./pages/SettingsModal');
const { HistoryModal } = require('./pages/HistoryModal');
const { StatsModal }   = require('./pages/StatsModal');

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
