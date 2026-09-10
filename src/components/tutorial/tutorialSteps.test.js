import { describe, it, expect } from 'vitest';
import { tutorialSteps } from './tutorialSteps';

const LANGUAGES = ['de', 'en'];

// Seitennamen aus den echten Dateien in src/pages ableiten. Bewusst NICHT über
// pages.config.js: dessen Import zieht den kompletten App-Graph mit (Layout ->
// Header -> SoundManager legt beim Laden einen AudioContext an, den jsdom nicht
// kennt). import.meta.glob liefert nur die Pfade, ohne ein Modul auszuführen.
const PAGE_FILES = import.meta.glob('../../pages/*.jsx');
const KNOWN_ROUTES = new Set(
  Object.keys(PAGE_FILES)
    .map((path) => path.split('/').pop().replace(/\.jsx$/, ''))
    .filter((name) => !name.endsWith('.test'))
);
// Routen, die App.jsx unter einem anderen Namen registriert als die Datei heisst.
['LiveTrip'].forEach((r) => KNOWN_ROUTES.add(r));

describe('Tutorial-Schritte', () => {
  it('liegen in beiden Sprachen vor', () => {
    for (const lang of LANGUAGES) {
      expect(Array.isArray(tutorialSteps[lang]), lang).toBe(true);
      expect(tutorialSteps[lang].length).toBeGreaterThan(0);
    }
  });

  it('haben in beiden Sprachen dieselbe Länge und Reihenfolge der Ziele', () => {
    // Sonst zeigt die englische Tour eine andere Reihenfolge als die deutsche.
    expect(tutorialSteps.en).toHaveLength(tutorialSteps.de.length);
    expect(tutorialSteps.en.map((s) => s.route)).toEqual(tutorialSteps.de.map((s) => s.route));
  });

  it('haben überall Titel und Inhalt', () => {
    for (const lang of LANGUAGES) {
      tutorialSteps[lang].forEach((step, i) => {
        expect(step.title, `${lang}[${i}].title`).toBeTruthy();
        expect(step.content, `${lang}[${i}].content`).toBeTruthy();
      });
    }
  });

  it('verweisen nur auf Routen, die es wirklich gibt', () => {
    // Ein Tippfehler in `route` schickte den Nutzer bisher auf die 404-Seite.
    for (const lang of LANGUAGES) {
      for (const step of tutorialSteps[lang]) {
        if (!step.route) continue;
        expect(KNOWN_ROUTES.has(step.route), `${lang}: unbekannte Route "${step.route}"`).toBe(true);
      }
    }
  });

  it('erklären das Angel-Level-System', () => {
    for (const lang of LANGUAGES) {
      const step = tutorialSteps[lang].find((s) => s.route === 'Tools');
      expect(step, `${lang}: Schritt zur Tool-Übersicht fehlt`).toBeTruthy();
    }
  });
});
