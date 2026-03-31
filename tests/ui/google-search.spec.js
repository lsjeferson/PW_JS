const { test, expect } = require('@playwright/test');
const { GoogleHomePage } = require('../../pages/GoogleHomePage');

test.describe('Pesquisa no Google', () => {
  test('deve acessar google.com e pesquisar por Playwright', async ({ page }) => {
    const googleHomePage = new GoogleHomePage(page);

    await googleHomePage.goto();
    await googleHomePage.search('Playwright');

    await expect(page).toHaveURL(/google\.com\/search/);
  });
});
