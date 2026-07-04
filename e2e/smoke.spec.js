import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installApiMocks } from './fixtures/apiMock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Routen aus src/pages.config.js extrahieren, ohne die React-Komponenten zu
// importieren (der Test laeuft in Node, nicht im Browser) — reiner Text-Scan
// des PAGES-Objekts.
function extractPageRoutes() {
  const configSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/pages.config.js'), 'utf-8');
  // Am Zeilenanfang verankert (^), damit das gleichnamige Beispiel im
  // JSDoc-Kommentar am Dateianfang (dort eingerueckt mit " * ") nicht
  // faelschlich matcht.
  const pagesBlockMatch = configSrc.match(/^export const PAGES = \{([\s\S]*?)\n\}/m);
  if (!pagesBlockMatch) throw new Error('PAGES-Block in pages.config.js nicht gefunden');
  const keys = [...pagesBlockMatch[1].matchAll(/"([^"]+)":/g)].map((m) => m[1]);
  return [...new Set(keys)].map((key) => `/${key}`);
}

// Zusaetzliche Routen, die direkt in src/App.jsx lazy geroutet werden (nicht
// Teil von pages.config.js).
const EXTRA_ROUTES = [
  '/CatchStats',
  '/AdminTracking',
  '/Help',
  '/events-catalog',
  '/events/create',
  '/leaderboards/monthly',
];

const ALL_ROUTES = ['/', ...extractPageRoutes(), ...EXTRA_ROUTES];

function crawlRoute(route, { authenticated }) {
  test(`${route} rendert ohne Absturz (${authenticated ? 'eingeloggt' : 'ausgeloggt'})`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await installApiMocks(page, { authenticated });

    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Kein 'networkidle': Wetter-/Karten-Widgets pollen dauerhaft. Stattdessen
    // fest warten, bis React gerendert und ErrorBoundary-Fallbacks sichtbar
    // waeren.
    await page.waitForTimeout(1500);

    const boundaryCrash = await page
      .getByText(/etwas ist schiefgelaufen|ein fehler ist aufgetreten/i)
      .first()
      .isVisible()
      .catch(() => false);

    // console.error wird nur gesammelt (Baseline-Rauschen ist erwartbar),
    // aber uncaught exceptions und sichtbare ErrorBoundary-Fallbacks sind ein
    // echter Absturz und lassen den Test scheitern.
    if (pageErrors.length > 0 || boundaryCrash) {
      console.log(`[crawl] ${route}: console.error=${consoleErrors.length}`, consoleErrors.slice(0, 5));
    }
    expect(pageErrors, `Uncaught exceptions auf ${route}`).toEqual([]);
    expect(boundaryCrash, `ErrorBoundary-Fallback sichtbar auf ${route}`).toBe(false);
  });
}

test.describe('Routen-Crawl (ausgeloggt)', () => {
  for (const route of ALL_ROUTES) crawlRoute(route, { authenticated: false });
});

test.describe('Routen-Crawl (eingeloggt)', () => {
  for (const route of ALL_ROUTES) crawlRoute(route, { authenticated: true });
});
