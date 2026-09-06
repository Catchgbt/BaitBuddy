import { test, expect } from '@playwright/test';
import { installApiMocks, dismissSplash, FIXTURE_CATCHES } from './fixtures/apiMock.js';

// E2E fuer das Fangbuch: der Weg Backend-Daten -> TanStack-Query-Cache ->
// gerenderte Statistik und Formular. Der Route-Crawl (smoke.spec.js) prueft nur,
// dass die Seite nicht abstuerzt; hier geht es um die tatsaechlichen Inhalte.

async function openLogbook(page) {
  await page.goto('/Logbook', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await dismissSplash(page);
}

test.describe('Fangbuch', () => {
  test('rechnet die Statistik-Kacheln aus den geladenen Faengen', async ({ page }) => {
    await installApiMocks(page, { authenticated: true });
    await openLogbook(page);

    // Zwei Faenge, zwei verschiedene Arten, 4.2 + 2.7 = 6.9 kg. Jede Kachel
    // rendert Zahl und Beschriftung im selben Container ("2Arten"), deshalb
    // ueber den exakten Beschriftungstext auf die Kachel gehen.
    const tile = (label) => page.getByText(label, { exact: true }).locator('..');
    await expect(tile('Einträge')).toContainText(String(FIXTURE_CATCHES.length), { timeout: 20_000 });
    await expect(tile('Arten')).toContainText('2');
    await expect(tile('kg gesamt')).toContainText('6.9');
  });

  test('blendet die Statistik ohne Faenge aus und zeigt trotzdem das Formular', async ({ page }) => {
    await installApiMocks(page, { authenticated: true, data: { catches: [] } });
    await openLogbook(page);

    await expect(page.getByLabel('Fischart *')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('kg gesamt')).toHaveCount(0);
  });

  test('verlangt eine Fischart, bevor gespeichert wird', async ({ page }) => {
    await installApiMocks(page, { authenticated: true, data: { catches: [] } });
    await openLogbook(page);

    let createCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/catches') && req.method() === 'POST') createCalled = true;
    });

    const speciesField = page.getByLabel('Fischart *');
    await speciesField.waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByLabel('Gewicht (kg)').fill('3.5');
    await page.getByRole('button', { name: /Fang speichern|Speichern/ }).first().click();

    await page.waitForTimeout(1000);
    expect(createCalled, 'Ohne Fischart darf kein Fang angelegt werden').toBe(false);
  });

  test('legt einen Fang mit den eingegebenen Werten an', async ({ page }) => {
    await installApiMocks(page, { authenticated: true, data: { catches: [] } });
    await openLogbook(page);

    await page.getByLabel('Fischart *').waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByLabel('Fischart *').fill('Barsch');
    await page.getByLabel('Gewicht (kg)').fill('0.8');

    const createRequest = page.waitForRequest(
      (req) => req.url().includes('/api/catches') && req.method() === 'POST',
      { timeout: 20_000 }
    );
    await page.getByRole('button', { name: /Fang speichern|Speichern/ }).first().click();

    const payload = (await createRequest).postDataJSON();
    expect(payload).toMatchObject({ species: 'Barsch', weight_kg: 0.8 });
  });

  test('bleibt bedienbar, wenn das Backend die Faenge nicht liefert', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await installApiMocks(page, {
      authenticated: true,
      handlers: { '/api/catches': { status: 500, body: { error: 'DB nicht erreichbar' } } },
    });
    await openLogbook(page);
    await page.waitForTimeout(2000);

    // Kein Absturz, und das Erfassungsformular steht weiterhin bereit.
    expect(pageErrors).toEqual([]);
    await expect(page.getByLabel('Fischart *')).toBeVisible({ timeout: 20_000 });
  });
});
