const { expect } = require('@playwright/test');

class MainPage {
  constructor(page) {
    this.page = page;

    // Desktop nav items
    this.navHome    = page.getByTestId('nav-home');
    this.navLibrary = page.getByTestId('nav-library');
    this.navHistory = page.getByTestId('nav-history');
    this.navProfile = page.getByTestId('nav-profile');

    // Roll call
    this.rollCallChips = page.getByTestId('roll-call-chips');

    // Quick search
    this.searchInput   = page.getByTestId('search-input');
    this.searchClearBtn = page.getByTestId('search-clear-btn');

    // Filters
    this.playersInput    = page.getByTestId('filter-players');
    this.playtimeSelect  = page.getByTestId('filter-playtime');
    this.complexitySelect = page.getByTestId('filter-complexity');
    this.typeSelect      = page.getByTestId('filter-type');
    this.ageSelect       = page.getByTestId('filter-age');
    this.setupSelect     = page.getByTestId('filter-setup');
    this.minRatingSelect = page.getByTestId('filter-min-rating');
    this.newOnlyBtn      = page.getByTestId('new-only-btn');
    this.coopBtn         = page.getByTestId('coop-btn');

    // Games import prompt
    this.gamesImportPrompt = page.getByTestId('games-import-prompt');
    this.gamesImportYes    = page.getByTestId('games-import-yes');
    this.gamesImportNo     = page.getByTestId('games-import-no');

    // History import prompt
    this.historyImportPrompt = page.getByTestId('history-import-prompt');
    this.historyImportYes    = page.getByTestId('history-import-yes');
    this.historyImportNo     = page.getByTestId('history-import-no');

    // Active sessions import prompt
    this.activeSessionsImportPrompt = page.getByTestId('active-sessions-import-prompt');
    this.activeSessionsImportYes    = page.getByTestId('active-sessions-import-yes');
    this.activeSessionsImportNo     = page.getByTestId('active-sessions-import-no');

    // Action buttons
    this.findGamesBtn = page.getByTestId('btn-find-games');
    this.surpriseBtn  = page.getByTestId('btn-surprise');

    // Results
    this.results   = page.getByTestId('results');
    this.noResults = page.getByTestId('no-results');
    this.gameList  = page.getByTestId('game-list');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  // ── Roll Call ──────────────────────────────────────────────────────────────
  rollCallChip(playerName) {
    return this.rollCallChips.getByTestId('roll-call-chip').filter({ hasText: playerName });
  }

  async toggleRollCall(playerName) {
    await this.rollCallChip(playerName).click();
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  async setPlayers(n) {
    await this.playersInput.fill(String(n));
  }

  async setComplexity(value) {
    await this.complexitySelect.selectOption(value);
  }

  async setType(value) {
    await this.typeSelect.selectOption(value);
  }

  // ── Game list ──────────────────────────────────────────────────────────────
  gameCards() {
    return this.gameList.getByTestId('game-card');
  }

  async findGames() {
    await this.findGamesBtn.click();
  }

  async surpriseMe() {
    await this.surpriseBtn.click();
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async expandGameCard(index = 0) {
    await this.gameCards().nth(index).click();
  }

  async letsPlay(index = 0) {
    await this.expandGameCard(index);
    await this.gameCards().nth(index).getByTestId('lets-play-btn').click();
  }

  // ── Assertions ─────────────────────────────────────────────────────────────
  async expectResults() {
    await expect(this.results).not.toHaveClass(/hidden/);
    await expect(this.noResults).toHaveClass(/hidden/);
  }

  async expectNoResults() {
    await expect(this.noResults).not.toHaveClass(/hidden/);
  }
}

module.exports = { MainPage };
