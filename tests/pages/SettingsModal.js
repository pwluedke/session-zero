const { expect } = require('@playwright/test');

class SettingsModal {
  constructor(page) {
    this.page      = page;
    this.modal     = page.getByTestId('settings-modal');
    this.whyBtn    = page.getByTestId('setting-why-btn');
    this.syncStatus = page.getByTestId('bgg-sync-status');
  }

  async open() {
    await this.page.getByTestId('btn-settings').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('settings-modal-close').click();
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
}

module.exports = { SettingsModal };
