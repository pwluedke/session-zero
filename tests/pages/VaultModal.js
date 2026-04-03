const { expect } = require('@playwright/test');

class VaultModal {
  constructor(page) {
    this.page      = page;
    this.modal     = page.getByTestId('vault-modal');
    this.nameInput = page.getByTestId('vault-name-input');
    this.addBtn    = page.getByTestId('vault-add-btn');
    this.list      = page.getByTestId('vault-list');
  }

  async open() {
    await this.page.getByTestId('btn-vault').click();
    await expect(this.modal).toHaveClass(/active/);
  }

  async close() {
    await this.page.getByTestId('vault-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }

  async addPlayer(name) {
    await this.nameInput.fill(name);
    await this.addBtn.click();
  }

  player(name) {
    return this.list.getByTestId('vault-player').filter({ hasText: name });
  }

  async removePlayer(name) {
    await this.player(name).getByTestId('vault-remove').click();
  }

  async expectPlayer(name) {
    await expect(this.player(name)).toBeVisible();
  }

  async expectNoPlayer(name) {
    await expect(this.player(name)).toHaveCount(0);
  }
}

module.exports = { VaultModal };
