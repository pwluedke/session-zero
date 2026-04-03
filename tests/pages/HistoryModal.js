const { expect } = require('@playwright/test');

class HistoryModal {
  constructor(page) {
    this.page  = page;
    this.modal = page.getByTestId('history-modal');
    this.list  = page.getByTestId('history-list');
  }

  async open() {
    await this.page.getByTestId('btn-history').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('history-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }
}

module.exports = { HistoryModal };
