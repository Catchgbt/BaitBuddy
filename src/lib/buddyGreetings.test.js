import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGreeting,
  getTimeSlot,
  FEATURE_TIPS,
  shouldGreet,
  markGreeted,
  getVariedPageBubble,
  GREETING_COOLDOWN_MS,
} from './buddyGreetings.js';

describe('getTimeSlot', () => {
  it('ordnet Stunden den richtigen Tageszeiten zu', () => {
    expect(getTimeSlot(6)).toBe('morgen');
    expect(getTimeSlot(10)).toBe('morgen');
    expect(getTimeSlot(11)).toBe('tag');
    expect(getTimeSlot(16)).toBe('tag');
    expect(getTimeSlot(17)).toBe('abend');
    expect(getTimeSlot(21)).toBe('abend');
    expect(getTimeSlot(22)).toBe('nacht');
    expect(getTimeSlot(3)).toBe('nacht');
    expect(getTimeSlot(0)).toBe('nacht');
  });
});

describe('buildGreeting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('liefert immer einen nicht-leeren Begrüßungstext', () => {
    for (const hour of [7, 13, 19, 23]) {
      const greeting = buildGreeting({ hour, withTip: false });
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(10);
    }
  });

  it('wiederholt die Basis-Begrüßung nicht bei zwei aufeinanderfolgenden Starts', () => {
    for (let i = 0; i < 10; i++) {
      const first = buildGreeting({ hour: 9, withTip: false });
      const second = buildGreeting({ hour: 9, withTip: false });
      expect(second).not.toBe(first);
    }
  });

  it('baut den Event-Namen und die Platzierung ein', () => {
    const event = { id: 'e1', name: 'Hecht-Cup', days_left: 3 };
    const withRank = buildGreeting({ hour: 12, event, rank: 2, withTip: false });
    expect(withRank).toContain('Hecht-Cup');
    expect(withRank).toContain('2');

    const asLeader = buildGreeting({ hour: 12, event, rank: 1, withTip: false });
    expect(asLeader).toContain('Hecht-Cup');
  });

  it('lädt ohne Platzierung zur Event-Teilnahme ein', () => {
    const event = { id: 'e1', name: 'Sommer-Angeln', days_left: 5 };
    const greeting = buildGreeting({ hour: 12, event, rank: null, withTip: false });
    expect(greeting).toContain('Sommer-Angeln');
  });

  it('hängt auf Wunsch einen Funktions-Tipp an', () => {
    const greeting = buildGreeting({ hour: 12, withTip: true });
    const hasTip = FEATURE_TIPS.some((tip) => greeting.includes(tip));
    expect(hasTip).toBe(true);
  });

  it('funktioniert auch ohne localStorage (In-Memory-Fallback)', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('localStorage gesperrt');
    };
    try {
      const greeting = buildGreeting({ hour: 12, withTip: false });
      expect(greeting.length).toBeGreaterThan(10);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('shouldGreet / markGreeted (Cooldown)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('begrüßt beim allerersten Mal (kein Zeitstempel)', () => {
    expect(shouldGreet()).toBe(true);
  });

  it('begrüßt direkt nach markGreeted nicht erneut', () => {
    const now = 1_000_000_000_000;
    markGreeted(now);
    expect(shouldGreet(now + 1000)).toBe(false);
  });

  it('begrüßt nach Ablauf des Cooldowns wieder (App später erneut geöffnet)', () => {
    const now = 1_000_000_000_000;
    markGreeted(now);
    expect(shouldGreet(now + GREETING_COOLDOWN_MS + 1)).toBe(true);
  });
});

describe('getVariedPageBubble', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('zeigt bei niedrigem Roll die Seitenfrage', () => {
    expect(getVariedPageBubble('SEITENFRAGE', 0)).toBe('SEITENFRAGE');
  });

  it('zeigt bei mittlerem Roll eine variierende Buddy-Frage (nicht die Seitenfrage)', () => {
    const text = getVariedPageBubble('SEITENFRAGE', 0.6);
    expect(text).not.toBe('SEITENFRAGE');
    expect(text.length).toBeGreaterThan(5);
  });

  it('zeigt bei hohem Roll einen Funktions-Tipp', () => {
    const text = getVariedPageBubble('SEITENFRAGE', 0.9);
    expect(FEATURE_TIPS).toContain(text);
  });
});
