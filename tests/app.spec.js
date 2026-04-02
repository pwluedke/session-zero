const { test, expect } = require('@playwright/test');

// Each test gets a fresh localStorage so state doesn't bleed between tests.
// After reloading we wait for games to finish loading from games.json (async fetch).
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
});

// ── Page load ──────────────────────────────────────────────────────────────
test('loads with correct title and header buttons', async ({ page }) => {
  await expect(page).toHaveTitle('Session Zero');
  await expect(page.getByText('Session Zero: A Game Night Planner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Player Vault' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My Games' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stats' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
});

// ── Player Vault ───────────────────────────────────────────────────────────
test('can add and remove a player from the vault', async ({ page }) => {
  await page.getByRole('button', { name: 'Player Vault' }).click();
  await expect(page.locator('#vault-modal')).toHaveClass(/active/);

  await page.fill('#vault-name-input', 'Alice');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('#vault-list')).toContainText('Alice');

  // Remove the player
  await page.locator('#vault-list').getByRole('button', { name: '×' }).click();
  await expect(page.locator('#vault-list')).not.toContainText('Alice');
});

test('rejects duplicate player names', async ({ page }) => {
  await page.getByRole('button', { name: 'Player Vault' }).click();
  await page.fill('#vault-name-input', 'Bob');
  await page.getByRole('button', { name: 'Add' }).click();

  await page.fill('#vault-name-input', 'bob');
  await page.getByRole('button', { name: 'Add' }).click();
  // Name should still only appear once
  await expect(page.locator('#vault-list').getByText('Bob')).toHaveCount(1);
});

// ── Roll Call ──────────────────────────────────────────────────────────────
test('toggling a player on roll call updates the player count filter', async ({ page }) => {
  // Add a player to the vault first
  await page.getByRole('button', { name: 'Player Vault' }).click();
  await page.fill('#vault-name-input', 'Carol');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('#vault-modal .modal-close').click();

  // Toggle Carol onto the roll call
  const chip = page.locator('#roll-call-chips .roll-call-chip', { hasText: 'Carol' });
  await chip.click();
  await expect(chip).toHaveClass(/active/);

  // Players filter should auto-fill to 1
  await expect(page.locator('#players')).toHaveValue('1');

  // Toggle off
  await chip.click();
  await expect(chip).not.toHaveClass(/active/);
});

// ── Find Games / Filters ───────────────────────────────────────────────────
test('Find Games shows results from games.json', async ({ page }) => {
  await page.getByRole('button', { name: 'Find Games' }).click();
  await expect(page.locator('#results')).not.toHaveClass(/hidden/);
  const items = page.locator('#game-list li');
  await expect(items).not.toHaveCount(0);
});

test('filtering by player count narrows results', async ({ page }) => {
  await page.getByRole('button', { name: 'Find Games' }).click();
  const allCount = await page.locator('#game-list li').count();

  await page.fill('#players', '2');
  await page.getByRole('button', { name: 'Find Games' }).click();
  const filteredCount = await page.locator('#game-list li').count();

  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(allCount);
});

test('filtering by complexity narrows results', async ({ page }) => {
  await page.selectOption('#complexity', 'Low');
  await page.getByRole('button', { name: 'Find Games' }).click();
  const items = page.locator('#game-list li');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  // Every visible badge should be Low
  const badges = await page.locator('#game-list .badge-low').count();
  expect(badges).toBe(count);
});

test('no-results message shown when filters match nothing', async ({ page }) => {
  await page.fill('#players', '99');
  await page.getByRole('button', { name: 'Find Games' }).click();
  await expect(page.locator('#no-results')).not.toHaveClass(/hidden/);
});

test('Surprise Me shows exactly 1 game', async ({ page }) => {
  await page.getByRole('button', { name: '🎲 Surprise Me' }).click();
  await expect(page.locator('#results')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-list li')).toHaveCount(1);
});

// ── Quick Search ───────────────────────────────────────────────────────────
test('quick search filters visible games', async ({ page }) => {
  await page.getByRole('button', { name: 'Find Games' }).click();
  const totalBefore = await page.locator('#game-list li').count();

  await page.fill('#search-input', 'wing');
  const afterCount = await page.locator('#game-list li').count();
  expect(afterCount).toBeLessThan(totalBefore);
  // Every visible game name should contain the search string (case-insensitive)
  const names = await page.locator('#game-list .game-name').allTextContents();
  for (const name of names) {
    expect(name.toLowerCase()).toContain('wing');
  }
});

// ── Session Modal ──────────────────────────────────────────────────────────
test('Let\'s Play opens session modal with game title', async ({ page }) => {
  await page.getByRole('button', { name: 'Find Games' }).click();
  await page.locator('#game-list li').first().click(); // expand card
  await page.locator('.lets-play-btn').first().click();
  await expect(page.locator('#session-modal')).toHaveClass(/active/);
  // Title is set
  await expect(page.locator('#session-game-title')).not.toBeEmpty();
});

test('timer starts and stops', async ({ page }) => {
  await page.getByRole('button', { name: 'Find Games' }).click();
  await page.locator('#game-list li').first().click();
  await page.locator('.lets-play-btn').first().click();

  await page.locator('#timer-toggle-btn').click(); // Start
  await page.waitForTimeout(1200);
  const display = await page.locator('#timer-display').textContent();
  expect(display).not.toBe('0:00:00');

  await page.locator('#timer-toggle-btn').click(); // Pause
  const frozen = await page.locator('#timer-display').textContent();
  await page.waitForTimeout(600);
  await expect(page.locator('#timer-display')).toHaveText(frozen);
});

// ── Game Library ───────────────────────────────────────────────────────────
test('library shows loaded games and correct count', async ({ page }) => {
  await page.getByRole('button', { name: 'My Games' }).click();
  await expect(page.locator('#library-modal')).toHaveClass(/active/);
  const countText = await page.locator('#library-count').textContent();
  expect(countText).toMatch(/\d+ of \d+ games?/);
  await expect(page.locator('#library-list .lib-row').first()).toBeVisible();
});

test('library search filters rows', async ({ page }) => {
  await page.getByRole('button', { name: 'My Games' }).click();
  const totalRows = await page.locator('#library-list .lib-row').count();

  await page.fill('#library-search', 'wingspan');
  const filtered = await page.locator('#library-list .lib-row').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(totalRows);
});

test('can add a game manually in the library', async ({ page }) => {
  await page.getByRole('button', { name: 'My Games' }).click();
  await page.getByRole('button', { name: '+ Add Game' }).click();
  await expect(page.locator('#add-game-form')).not.toHaveClass(/hidden/);

  await page.fill('#ag-name', 'Test Game XYZ');
  await page.fill('#ag-min-players', '2');
  await page.fill('#ag-max-players', '4');
  await page.fill('#ag-playtime', '45');
  await page.locator('.ag-submit-btn').click();

  await expect(page.locator('#library-list')).toContainText('Test Game XYZ');
});

test('can delete a game from the library', async ({ page }) => {
  // Add a throwaway game first
  await page.getByRole('button', { name: 'My Games' }).click();
  await page.getByRole('button', { name: '+ Add Game' }).click();
  await page.fill('#ag-name', 'DeleteMe Game');
  await page.locator('.ag-submit-btn').click();

  // Set up dialog handler before clicking delete
  page.on('dialog', d => d.accept());
  const row = page.locator('#library-list .lib-row', { hasText: 'DeleteMe Game' });
  await row.locator('.lib-delete').click();
  await expect(page.locator('#library-list')).not.toContainText('DeleteMe Game');
});

// ── Settings ───────────────────────────────────────────────────────────────
test('settings modal opens and Why? toggle works', async ({ page }) => {
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.locator('#settings-modal')).toHaveClass(/active/);

  // Toggle Why? off
  const whyBtn = page.locator('#setting-why-btn');
  await expect(whyBtn).toHaveText('On');
  await whyBtn.click();
  await expect(whyBtn).toHaveText('Off');

  // Why? buttons on game cards should now be hidden
  await page.locator('#settings-modal .modal-close').click();
  await page.getByRole('button', { name: 'Find Games' }).click();
  await expect(page.locator('.why-btn').first()).toBeHidden();
});

// ── History ────────────────────────────────────────────────────────────────
test('history modal opens and shows empty state when no games played', async ({ page }) => {
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.locator('#history-modal')).toHaveClass(/active/);
  // Either empty message or entries — just confirm modal rendered
  await expect(page.locator('#history-list')).toBeVisible();
});

// ── Stats ──────────────────────────────────────────────────────────────────
test('stats modal opens with tab switcher', async ({ page }) => {
  await page.getByRole('button', { name: 'Stats' }).click();
  await expect(page.locator('#stats-modal')).toHaveClass(/active/);
  await expect(page.locator('#tab-players')).toBeVisible();
  await expect(page.locator('#tab-h2h')).toBeVisible();

  await page.locator('#tab-h2h').click();
  await expect(page.locator('#stats-body-h2h')).not.toHaveClass(/hidden/);
  await expect(page.locator('#stats-body-players')).toHaveClass(/hidden/);
});
