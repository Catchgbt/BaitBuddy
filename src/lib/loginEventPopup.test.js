import { describe, it, expect, vi, beforeEach } from 'vitest';

const filterMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/api/frontendClient', () => ({
  entities: { AppEvent: { filter: (...args) => filterMock(...args) } },
}));
vi.mock('sonner', () => ({ toast: (...args) => toastMock(...args) }));

const { maybeShowEventPopup, EVENT_POPUP_DWELL_MS } = await import('./loginEventPopup');

const SEEN_KEY = 'catchgbt_event_popup_seen';

function activeEvent(overrides = {}) {
  const now = Date.now();
  return {
    name: 'Herbst-Cup',
    description: 'Groesster Hecht gewinnt',
    prize_description: 'Neue Rute',
    start_date: new Date(now - 86_400_000).toISOString(),
    end_date: new Date(now + 86_400_000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('maybeShowEventPopup', () => {
  it('zeigt einen Toast fuer ein laufendes Event und merkt sich das', async () => {
    filterMock.mockResolvedValue([activeEvent()]);

    await expect(maybeShowEventPopup()).resolves.toBe(true);

    expect(filterMock).toHaveBeenCalledWith({ is_active: true });
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [title, options] = toastMock.mock.calls[0];
    expect(title).toBe('Herbst-Cup');
    expect(options.description).toContain('Groesster Hecht gewinnt');
    expect(options.description).toContain('Preis: Neue Rute');
    expect(options.description).toContain('Event endet am:');
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  it('zeigt den Hinweis kein zweites Mal', async () => {
    localStorage.setItem(SEEN_KEY, '1');
    await expect(maybeShowEventPopup()).resolves.toBe(false);
    expect(filterMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('ignoriert Events, die noch nicht begonnen haben', async () => {
    filterMock.mockResolvedValue([
      activeEvent({ start_date: new Date(Date.now() + 86_400_000).toISOString() }),
    ]);
    await expect(maybeShowEventPopup()).resolves.toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
    // Ein noch nicht gestartetes Event darf den Hinweis nicht verbrauchen.
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('ignoriert bereits beendete Events', async () => {
    filterMock.mockResolvedValue([
      activeEvent({ end_date: new Date(Date.now() - 1000).toISOString() }),
    ]);
    await expect(maybeShowEventPopup()).resolves.toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('kommt ohne Events klar', async () => {
    filterMock.mockResolvedValue([]);
    await expect(maybeShowEventPopup()).resolves.toBe(false);
  });

  it('haelt den Login nicht auf, wenn die Event-Abfrage fehlschlaegt', async () => {
    filterMock.mockRejectedValue(new Error('API down'));
    await expect(maybeShowEventPopup()).resolves.toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('bricht die Event-Abfrage nach dem Timeout ab, statt zu haengen', async () => {
    vi.useFakeTimers();
    try {
      filterMock.mockReturnValue(new Promise(() => {})); // antwortet nie
      const pending = maybeShowEventPopup();
      await vi.advanceTimersByTimeAsync(3000);
      await expect(pending).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gibt eine Nachlaufzeit vor, damit der Toast lesbar bleibt', () => {
    expect(EVENT_POPUP_DWELL_MS).toBeGreaterThan(0);
  });
});
