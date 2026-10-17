import { test, expect } from '@playwright/test';
import { installApiMocks, dismissSplash, FIXTURE_SPOTS } from './fixtures/apiMock.js';

test.use({ viewport: { width: 390, height: 844 } });

test('map search, fish filters, preview and optional tour work on mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await installApiMocks(page, { authenticated: true, data: { spots: [{ ...FIXTURE_SPOTS[0], target_species: ['Hecht'] }] } });
  const nextHour = Math.ceil(Date.now() / 3600000) * 3600;
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
    timezone: 'Europe/Berlin', current: { temperature_2m: 18, wind_speed_10m: 12 },
    hourly: { time: [nextHour, nextHour + 3600], temperature_2m: [18, 18], wind_speed_10m: [12, 12], pressure_msl: [1015, 1015], precipitation: [0, 0], cloud_cover: [50, 50], weather_code: [2, 2] },
  } }));
  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: { results: [{ id: 1, name: 'Köln', latitude: 50.94, longitude: 6.96, country: 'Deutschland' }] } }));
  await page.goto('/Map');
  await dismissSplash(page);
  await page.getByRole('button', { name: 'Hinweis schließen' }).click();
  await expect(page.getByRole('search')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Kartenebenen', exact: true }).click();
  await expect(page.getByRole('button', { name: /Satelliten-Bilder/ })).toBeVisible();
  await page.getByRole('button', { name: 'Kartenebenen schließen', exact: true }).click();
  await expect(page.getByText('Spot hier speichern', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Zander', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '0 Spots mit Zander' })).toBeVisible();
  await page.getByRole('button', { name: 'Hecht', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 Spots mit Hecht' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Gewässer oder Ort suchen' }).fill('Rheinaue');
  await page.getByRole('button', { name: 'Rheinaue Nord' }).click();
  const preview = page.getByRole('region', { name: 'Ausgewählter Spot' });
  await expect(preview.getByRole('heading', { name: 'Rheinaue Nord' })).toBeVisible();
  await expect(preview.getByRole('link', { name: 'Route starten' })).toHaveAttribute('href', /destination=50.9375,6.9603/);
  await preview.getByRole('button', { name: 'Spot merken' }).click();
  await expect(preview.getByRole('button', { name: 'Spot merken' })).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByText('Dein nächstes Zeitfenster')).toBeVisible();
  for (const width of [390, 320, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(preview).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spot hinzufügen', exact: true })).toBeInViewport();
    await expect(preview.getByRole('link', { name: 'Route starten' })).toBeInViewport();
    await page.getByRole('button', { name: 'Spot hinzufügen', exact: true }).click({ trial: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/map-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await preview.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByText('Gewässer-Infos', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Kartenoptionen', exact: true }).click();
  await page.getByRole('button', { name: 'Kurze Kartentour' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Gewässer oder Ort suchen' }).fill('Köln');
  await page.getByRole('button', { name: 'Ort suchen', exact: true }).click();
  await page.getByRole('button', { name: 'Köln Deutschland' }).click();
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: 'Spot hinzufügen', exact: true }).click();
  await expect(page.getByText('Neuer Spot', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
