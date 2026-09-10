import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TUTORIAL_COMPLETED_KEY,
  TUTORIAL_PROMPTED_KEY,
  isTutorialCompleted,
  markTutorialCompleted,
  markTutorialPrompted,
  shouldOfferTutorial,
  wasTutorialPrompted,
} from './tutorialState';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('tutorialState', () => {
  it('bietet die Tour einem frischen Nutzer an', () => {
    expect(shouldOfferTutorial()).toBe(true);
  });

  it('fragt nach einem „Später" nicht erneut', () => {
    markTutorialPrompted();
    expect(wasTutorialPrompted()).toBe(true);
    expect(shouldOfferTutorial()).toBe(false);
  });

  it('markiert den Abschluss und damit auch „gefragt"', () => {
    markTutorialCompleted();
    expect(isTutorialCompleted()).toBe(true);
    expect(wasTutorialPrompted()).toBe(true);
    expect(shouldOfferTutorial()).toBe(false);
  });

  it('schreibt genau die dokumentierten Schlüssel', () => {
    markTutorialCompleted();
    expect(localStorage.getItem(TUTORIAL_PROMPTED_KEY)).toBe('true');
    expect(localStorage.getItem(TUTORIAL_COMPLETED_KEY)).toBe('true');
  });

  it('überlebt einen werfenden localStorage (privates Fenster, WebView)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    // Kein Wurf nach aussen; ohne lesbaren Speicher gilt „noch nicht gefragt".
    expect(() => markTutorialPrompted()).not.toThrow();
    expect(markTutorialPrompted()).toBe(false);
    expect(wasTutorialPrompted()).toBe(false);
    expect(shouldOfferTutorial()).toBe(true);
  });
});
