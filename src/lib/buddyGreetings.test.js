import { describe, it, expect, beforeEach } from 'vitest';
import { buildGreeting, getTimeSlot, FEATURE_TIPS } from './buddyGreetings.js';

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
