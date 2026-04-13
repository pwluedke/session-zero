class LandingPage {
  constructor(page) {
    this.page = page;
    this.demoBtnLink       = page.getByTestId('demo-btn');
    this.googleSigninLink  = page.getByTestId('google-signin-btn');
    this.heading           = page.locator('h1');
    this.tagline           = page.locator('.tagline');
  }

  async goto() {
    await this.page.goto('/login');
  }
}

module.exports = { LandingPage };
