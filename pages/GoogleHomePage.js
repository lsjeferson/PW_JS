class GoogleHomePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.searchInput = page.locator('textarea[name="q"]');
    this.searchButton = page.locator('input[name="btnK"]');
  }

  async goto() {
    await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
  }

  async search(term) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}

module.exports = { GoogleHomePage };
