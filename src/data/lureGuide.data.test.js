import { describe, it, expect } from 'vitest';
import { LURES, getLureById, getStyleById } from './lureGuide.data';

describe('lureGuide.data', () => {
  it('enthält fünf Köder mit eindeutigen IDs', () => {
    expect(LURES).toHaveLength(5);
    const ids = LURES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('jeder Köder hat vollständige, nichtleere Technik-Texte', () => {
    for (const lure of LURES) {
      expect(lure.name.length).toBeGreaterThan(0);
      expect(lure.kurzbeschreibung.length).toBeGreaterThan(20);
      expect(lure.montage.length).toBeGreaterThan(40);
      expect(lure.bisserkennung.length).toBeGreaterThan(40);
      expect(lure.zielfische.length).toBeGreaterThan(0);
      expect(lure.typischeFehler.length).toBeGreaterThan(0);
      for (const fehler of lure.typischeFehler) {
        expect(fehler.length).toBeGreaterThan(10);
      }
    }
  });

  it('jeder Führungsstil hat Beschreibung und Animations-Parameter', () => {
    for (const lure of LURES) {
      expect(lure.styles.length).toBeGreaterThan(0);
      for (const style of lure.styles) {
        expect(style.id.length).toBeGreaterThan(0);
        expect(style.name.length).toBeGreaterThan(0);
        expect(style.beschreibung.length).toBeGreaterThan(30);
        expect(style.params.retrieveSpeed).toBeGreaterThan(0);
        for (const value of Object.values(style.params)) {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });

  it('getLureById und getStyleById lösen korrekt auf', () => {
    const gummifisch = getLureById('gummifisch');
    expect(gummifisch?.name).toBe('Gummifisch');
    expect(getStyleById(gummifisch, 'jiggen')?.name).toBe('Jiggen');
    expect(getLureById('unbekannt')).toBeNull();
    expect(getStyleById(gummifisch, 'unbekannt')).toBeNull();
    expect(getStyleById(null, 'jiggen')).toBeNull();
  });
});
