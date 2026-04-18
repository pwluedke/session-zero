const { expect } = require('@playwright/test');

class SettingsModal {
  constructor(page) {
    this.page        = page;
    this.modal       = page.getByTestId('profile-modal');
    this.whyBtn      = page.getByTestId('setting-why-btn');
    this.syncStatus  = page.getByTestId('bgg-sync-status');
    this.usernameInput = page.getByTestId('bgg-username-input');
    this.syncBtn     = page.getByTestId('bgg-sync-btn');
  }

  async open() {
    await this.page.getByTestId('nav-profile').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('profile-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }

  async toggleWhyBtn() {
    await this.whyBtn.click();
  }

  async expectWhyBtnOn() {
    await expect(this.whyBtn).toHaveText('On');
  }

  async expectWhyBtnOff() {
    await expect(this.whyBtn).toHaveText('Off');
  }

  async mockSettings(routeHandler) {
    await this.page.route('/api/settings*', routeHandler);
  }

  // Sets up a page.route() mock for /api/bgg/collection, opens Profile,
  // fills in a username, and clicks Sync. routeHandler receives the Playwright
  // Route object so callers can fulfill, abort, or return custom responses.
  async mockAndSync(routeHandler, username = 'testuser') {
    await this.page.route('/api/bgg/collection*', routeHandler);
    await this.open();
    await this.usernameInput.fill(username);
    await this.syncBtn.click();
    // Wait for sync button to re-enable - indicates the async handler finished
    await expect(this.syncBtn).toBeEnabled();
  }

  async expectSyncSuccess(text) {
    await expect(this.syncStatus).toHaveClass(/bgg-sync-ok/);
    if (text) await expect(this.syncStatus).toContainText(text);
  }

  async expectSyncError(text) {
    await expect(this.syncStatus).toHaveClass(/bgg-sync-error/);
    if (text) await expect(this.syncStatus).toContainText(text);
  }
}

module.exports = { SettingsModal };
