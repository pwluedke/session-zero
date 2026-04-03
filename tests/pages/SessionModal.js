const { expect } = require('@playwright/test');

class SessionModal {
  constructor(page) {
    this.page         = page;
    this.modal        = page.getByTestId('session-modal');
    this.title        = page.getByTestId('session-game-title');
    this.timerDisplay = page.getByTestId('timer-display');
    this.timerBtn     = page.getByTestId('timer-toggle-btn');
    this.timerReset   = page.getByTestId('timer-reset-btn');
    this.pauseBtn     = page.getByTestId('pause-btn');
    this.endGameBtn   = page.getByTestId('end-game-btn');
    this.finalizeBtn  = page.getByTestId('finalize-btn');
    this.playerList   = page.getByTestId('session-player-list');
    this.scoreList    = page.getByTestId('score-list');
  }

  async close() {
    await this.page.getByTestId('session-modal-close').click();
    await expect(this.modal).not.toHaveClass(/active/);
  }

  async startTimer() {
    await this.timerBtn.click();
    await expect(this.timerBtn).toHaveText('Pause');
  }

  async pauseTimer() {
    await this.timerBtn.click();
    await expect(this.timerBtn).toHaveText('Start');
  }

  async expectOpen() {
    await expect(this.modal).toHaveClass(/active/);
  }

  async expectTitle(name) {
    await expect(this.title).toHaveText(name);
  }

  async expectTimerRunning() {
    await expect(this.timerBtn).toHaveText('Pause');
  }

  async expectTimerStopped() {
    await expect(this.timerBtn).toHaveText('Start');
  }
}

module.exports = { SessionModal };
