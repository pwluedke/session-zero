const { expect } = require('@playwright/test');

class NavBar {
  constructor(page) {
    this.page = page;

    // Desktop nav (768px and above)
    this.desktopNav    = page.getByTestId('desktop-nav');
    this.navHome       = page.getByTestId('nav-home');
    this.navLibrary    = page.getByTestId('nav-library');
    this.navHistory    = page.getByTestId('nav-history');
    this.navProfile    = page.getByTestId('nav-profile');
    this.navAdmin      = page.getByTestId('nav-admin');

    // Mobile nav (below 768px)
    this.mobileNav          = page.getByTestId('mobile-nav');
    this.mobileNavHome      = page.getByTestId('mobile-nav-home');
    this.mobileNavLibrary   = page.getByTestId('mobile-nav-library');
    this.mobileNavHistory   = page.getByTestId('mobile-nav-history');
    this.mobileNavProfile   = page.getByTestId('mobile-nav-profile');
    this.mobileNavAdmin     = page.getByTestId('mobile-nav-admin');
  }

  async expectDesktopNavVisible() {
    await expect(this.desktopNav).toBeVisible();
    await expect(this.mobileNav).not.toBeVisible();
  }

  async expectMobileNavVisible() {
    await expect(this.mobileNav).toBeVisible();
    await expect(this.desktopNav).not.toBeVisible();
  }

  async expectActiveNav(name) {
    const item = this.page.getByTestId(`nav-${name}`);
    await expect(item).toHaveClass(/active/);
  }
}

module.exports = { NavBar };
