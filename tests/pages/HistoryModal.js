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

  async seedHistory(entries) {
    await this.page.route(url => url.href.includes('/api/history'), async route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(entries) });
      }
      return route.fallback();
    });
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  card(gameName) {
    return this.list.locator('.history-card').filter({ hasText: gameName });
  }
}

module.exports = { HistoryModal };
