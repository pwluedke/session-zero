const { expect } = require('@playwright/test');

class PendingPage {
  constructor(page) {
    this.page    = page;
    this.card    = page.getByTestId('pending-page');
    this.message = page.getByTestId('pending-message');
  }

  async goto() {
    await this.page.goto('/pending');
  }

  async expectMessage() {
    await expect(this.message).toContainText('pending approval');
  }
}

module.exports = { PendingPage };
