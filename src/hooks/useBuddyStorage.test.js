import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuddyStorage } from './useBuddyStorage';

// Regressions-Absicherung für B2/P2: Die Position darf nicht pro Drag-Frame
// synchron in localStorage geschrieben werden (Ruckeln), sondern gebündelt
// (gedrosselt) genau einmal pro Drag-Sequenz.
describe('useBuddyStorage – gedrosselte Positions-Persistenz', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schreibt erst nach dem Debounce und bündelt viele Frames zu einem Write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useBuddyStorage());

    const posWrites = () =>
      setItem.mock.calls.filter((c) => c[0] === 'buddy-widget-pos').length;

    // Simuliere eine Drag-Sequenz mit vielen Zwischenpositionen.
    act(() => {
      for (let i = 1; i <= 10; i++) {
        result.current.setWidgetPos({ x: i, y: i });
      }
    });

    // Während der Debounce läuft, darf noch nichts persistiert sein.
    expect(posWrites()).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Genau ein Write – mit der zuletzt gesetzten Position.
    expect(posWrites()).toBe(1);
    expect(JSON.parse(localStorage.getItem('buddy-widget-pos'))).toEqual({ x: 10, y: 10 });
  });

  it('persistiert nur den finalen Wert, wenn kurz hintereinander gesetzt wird', () => {
    const { result } = renderHook(() => useBuddyStorage());

    act(() => {
      result.current.setWidgetPos({ x: 1, y: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(150); // vor Ablauf des Debounce erneut setzen
      result.current.setWidgetPos({ x: 2, y: 2 });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(JSON.parse(localStorage.getItem('buddy-widget-pos'))).toEqual({ x: 2, y: 2 });
  });
});
