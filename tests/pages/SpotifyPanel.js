const { expect } = require('@playwright/test');

class SpotifyPanel {
  constructor(page) {
    this.page       = page;
    this.container  = page.getByTestId('spotify-container');
    this.iframe     = page.getByTestId('spotify-iframe');
    this.saveBtn    = page.getByTestId('spotify-save-btn');
    this.changeBtn  = page.getByTestId('spotify-change-btn');
    this.searchRow  = page.getByTestId('spotify-search-row');
    this.queryInput = page.getByTestId('spotify-query-input');
    this.noResult   = page.getByTestId('spotify-no-result');
  }

  async waitForEmbed() {
    await expect(this.iframe).toBeVisible({ timeout: 5000 });
  }

  async save() {
    await this.saveBtn.click();
    await expect(this.saveBtn).toHaveClass(/saved/);
  }

  async openSearch() {
    await this.changeBtn.click();
    await expect(this.searchRow).not.toHaveClass(/hidden/);
  }

  async searchFor(query) {
    await this.queryInput.fill(query);
    await this.queryInput.press('Enter');
  }
}

module.exports = { SpotifyPanel };
