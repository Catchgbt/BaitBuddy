import { test, expect } from '@playwright/test';
import { installApiMocks, dismissSplash } from './fixtures/apiMock.js';

test.use({ viewport: { width: 390, height: 844 } });

for (const planId of ['free', 'basic', 'pro']) {
  test(`Werbeschalter wird im laufenden ${planId}-Konto übernommen`, async ({ page }) => {
    let adsEnabled = true;
    let configRequests = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await installApiMocks(page, {
      authenticated: true,
      data: { plan: { plan: { id: planId, name: planId, is_active: true } } },
      handlers: {
        '/api/app/settings': { body: { ads_enabled: true, all_tools_free: true } },
        '/api/ads/config': route => {
          configRequests += 1;
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ ads_enabled: adsEnabled, basic_banner_enabled: true }),
          });
        },
      },
    });

    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await dismissSplash(page);
    await expect(page.getByRole('tablist', { name: 'Hauptnavigation' })).toBeVisible();
    await expect.poll(() => configRequests).toBeGreaterThan(0);
    const banner = page.getByRole('button').filter({ has: page.getByText('Partner-Anzeige', { exact: true }) });
    if (planId === 'pro') await expect(banner).toHaveCount(0);
    else await expect(banner).toBeVisible();

    adsEnabled = false;
    const beforeDisable = configRequests;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => configRequests).toBeGreaterThan(beforeDisable);
    await expect(banner).toHaveCount(0);

    adsEnabled = true;
    const beforeEnable = configRequests;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => configRequests).toBeGreaterThan(beforeEnable);
    if (planId === 'pro') await expect(banner).toHaveCount(0);
    else await expect(banner).toBeVisible();
    expect(errors).toEqual([]);
  });
}
