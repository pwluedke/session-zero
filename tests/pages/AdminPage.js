const { expect } = require('@playwright/test');

class AdminPage {
  constructor(page) {
    this.page = page;
    this.container    = page.getByTestId('admin-page');
    this.pendingList  = page.getByTestId('pending-list');
    this.pendingEmpty = page.getByTestId('pending-empty');
    this.activeList   = page.getByTestId('active-list');
    this.activeEmpty  = page.getByTestId('active-empty');
    this.enableAIAll  = page.getByTestId('enable-ai-all');
    this.disableAIAll = page.getByTestId('disable-ai-all');
    this.bulkStatus   = page.getByTestId('bulk-status');
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  pendingUser(email) {
    return this.page.locator(`[data-testid="pending-user"][data-email="${email}"]`);
  }

  activeUser(email) {
    return this.page.locator(`[data-testid="active-user"][data-email="${email}"]`);
  }

  approveBtn(email) {
    return this.pendingUser(email).getByTestId('approve-btn');
  }

  denyBtn(email) {
    return this.pendingUser(email).getByTestId('deny-btn');
  }

  revokeBtn(email) {
    return this.activeUser(email).getByTestId('revoke-btn');
  }

  aiCheckbox(email) {
    return this.activeUser(email).getByTestId('ai-enabled-checkbox');
  }

  aiLimitInput(email) {
    return this.activeUser(email).getByTestId('ai-daily-limit-input');
  }

  async expectPendingUser(email) {
    await expect(this.pendingUser(email)).toBeVisible();
  }

  async expectNoPendingUsers() {
    await expect(this.pendingEmpty).toBeVisible();
  }

  async expectActiveUser(email) {
    await expect(this.activeUser(email)).toBeVisible();
  }

  async expectNoActiveUsers() {
    await expect(this.activeEmpty).toBeVisible();
  }

  async approvePendingUser(email) {
    await this.approveBtn(email).click();
    await this.page.waitForLoadState('networkidle');
  }

  async denyPendingUser(email) {
    await this.denyBtn(email).click();
    await this.page.waitForLoadState('networkidle');
  }

  async revokeUser(email) {
    await this.revokeBtn(email).click();
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = { AdminPage };
