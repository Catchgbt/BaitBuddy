import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_PAGES, resolvePage } from './voicePages';
import { BUDDY_TIPS } from './buddyTips';

// Die Sprachsteuerung und die Buddy-Tipps führen Seiten-Keys als reine
// Strings. Ein Tippfehler oder eine umbenannte Seite fällt daher erst dann
// auf, wenn ein Nutzer den Sprachbefehl gibt und auf der 404-Seite landet —
// genau so waren "AIAssistant" (existierte nie) und "VoiceLecture" (Seite
// ohne Route) monatelang tot. Dieser Test vergleicht beide Listen mit den
// tatsächlich registrierten Routen.

function registeredRoutes() {
  const root = path.resolve(__dirname, '..');
  const config = fs.readFileSync(path.join(root, 'pages.config.js'), 'utf8');
  const pagesBlock = config.match(/export const PAGES = \{([\s\S]*?)\n\}/)[1];
  const routes = new Set(
    [...pagesBlock.matchAll(/"([A-Za-z0-9_-]+)":/g)].map((m) => m[1])
  );

  // App.jsx registriert zusaetzliche Routen manuell (CatchStats-Muster).
  const app = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8');
  for (const m of app.matchAll(/path="\/([A-Za-z0-9_-]+)/g)) routes.add(m[1]);

  return routes;
}

describe('Sprachsteuerung: Seiten-Keys zeigen auf echte Routen', () => {
  const routes = registeredRoutes();

  it('findet die registrierten Routen (Sanity-Check des Parsers)', () => {
    expect(routes.size).toBeGreaterThan(20);
    expect(routes.has('Dashboard')).toBe(true);
    expect(routes.has('KiBuddyBeta')).toBe(true);
  });

  it('jede Seite in ALLOWED_PAGES ist auch als Route registriert', () => {
    const dead = ALLOWED_PAGES.filter((page) => !routes.has(page));
    expect(dead).toEqual([]);
  });

  it('jedes Alias-Ziel loest auf eine registrierte Route auf', () => {
    // Über resolvePage gehen, damit auch die Alias-Tabelle geprüft wird.
    const aliases = ['chat', 'assistent', 'buddy', 'vorlesung', 'sprachchat', 'karte', 'wetter'];
    for (const alias of aliases) {
      const resolved = resolvePage(alias);
      expect(resolved, `Alias "${alias}" loest auf nichts auf`).not.toBeNull();
      expect(routes.has(resolved), `Alias "${alias}" -> "${resolved}" ist keine Route`).toBe(true);
    }
  });

  it('jeder seitenbezogene Buddy-Tipp gehoert zu einer registrierten Route', () => {
    // Die Tipp-Tabelle enthaelt neben Seiten-Keys auch generische Themen-Keys
    // (Fishing, Gear, Water, User ...), die bewusst keine Route sind.
    const generic = new Set(['Fishing', 'Water', 'User', 'Log', 'VoiceControl', 'BaitMixerPro']);
    const dead = Object.keys(BUDDY_TIPS).filter(
      (key) => !routes.has(key) && !generic.has(key)
    );
    expect(dead).toEqual([]);
  });
});
