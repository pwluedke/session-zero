const { expect } = require('@playwright/test');

class LibraryModal {
  constructor(page) {
    this.page       = page;
    this.modal      = page.getByTestId('library-modal');
    this.searchInput = page.getByTestId('library-search');
    this.count      = page.getByTestId('library-count');
    this.list       = page.getByTestId('library-list');
    this.addGameBtn = page.getByTestId('btn-add-game');
    this.addForm    = page.getByTestId('add-game-form');

    // Add game form fields
    this.agName       = page.getByTestId('ag-name');
    this.agMinPlayers = page.getByTestId('ag-min-players');
    this.agMaxPlayers = page.getByTestId('ag-max-players');
    this.agPlaytime   = page.getByTestId('ag-playtime');
    this.agSubmit     = page.getByTestId('ag-submit');
    this.agCancel     = page.getByTestId('ag-cancel');
  }

  async open() {
    await this.page.getByTestId('nav-library').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('library-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async sortBy(key) {
    await this.page.getByTestId(`lib-sort-${key}`).click();
  }

  rows() {
    return this.list.getByTestId('lib-row');
  }

  row(gameName) {
    return this.list.getByTestId('lib-row').filter({ hasText: gameName });
  }

  async openAddForm() {
    await this.addGameBtn.click();
    await expect(this.addForm).not.toHaveClass(/hidden/);
  }

  async addGame({ name, minPlayers = '2', maxPlayers = '4', playtime = '60' } = {}) {
    await this.openAddForm();
    await this.agName.fill(name);
    if (minPlayers) await this.agMinPlayers.fill(minPlayers);
    if (maxPlayers) await this.agMaxPlayers.fill(maxPlayers);
    if (playtime)   await this.agPlaytime.fill(playtime);
    await this.agSubmit.click();
  }

  async deleteGame(gameName) {
    await this.row(gameName).getByTestId('lib-delete').click();
  }

  async expectGame(gameName) {
    await expect(this.row(gameName)).toBeVisible();
  }

  async expectNoGame(gameName) {
    await expect(this.row(gameName)).toHaveCount(0);
  }

  async seedGames(games) {
    await this.page.route(url => url.href.includes('/api/games'), async route => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/sync')) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(games) });
      }
      return route.fallback();
    });
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = { LibraryModal };
