const { expect } = require('@playwright/test');

class HistoryModal {
  constructor(page) {
    this.page  = page;
    this.modal = page.getByTestId('history-section-modal');
    this.list  = page.getByTestId('history-list');
  }

  async open() {
    await this.page.getByTestId('nav-history').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('history-section-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }
}

module.exports = { HistoryModal };
