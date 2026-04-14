const { expect } = require('@playwright/test');

class StatsModal {
  constructor(page) {
    this.page          = page;
    this.modal         = page.getByTestId('history-section-modal');
    this.tabPlayers    = page.getByTestId('tab-players');
    this.tabH2H        = page.getByTestId('tab-h2h');
    this.bodyPlayers   = page.getByTestId('stats-body-players');
    this.bodyH2H       = page.getByTestId('stats-body-h2h');
  }

  async open() {
    await this.page.getByTestId('nav-history').click();
    await this.page.getByTestId('tab-nav-stats').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('history-section-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }

  async switchToH2H() {
    await this.tabH2H.click();
    await expect(this.bodyH2H).not.toHaveClass(/hidden/);
    await expect(this.bodyPlayers).toHaveClass(/hidden/);
  }

  async switchToPlayers() {
    await this.tabPlayers.click();
    await expect(this.bodyPlayers).not.toHaveClass(/hidden/);
    await expect(this.bodyH2H).toHaveClass(/hidden/);
  }
}

module.exports = { StatsModal };
