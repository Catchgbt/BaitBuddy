import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import React from 'react';

const { apiMock } = vi.hoisted(() => ({
  apiMock: { me: null, markLevelSeen: null },
}));

vi.mock('@/api/frontendClient', () => ({
  progression: {
    me: (...args) => apiMock.me(...args),
    markLevelSeen: (...args) => apiMock.markLevelSeen(...args),
  },
}));

import { ProgressionProvider, useProgression } from './ProgressionContext';

// Antwort von GET /api/progression/me für einen Nutzer auf Level 3.
function response(overrides = {}) {
  return {
    ok: true,
    xp: { total: 640, breakdown: [], incomplete_sources: [] },
    level: {
      current: 3, rank: 'Hakenheld', rank_icon: 'Anchor', prestige: 0, is_max_level: false,
      level_floor_xp: 600, next_level_xp: 1100, xp_in_level: 40, xp_to_next: 460,
      progress: 0.08, max_level: 10, prestige_xp_step: 2500,
    },
    plan_id: 'free',
    tools: [
      { id: 'fishing-map', name: 'Angel-Map', required_level: 2, unlocked: true, unlock_reason: 'level' },
      { id: 'bait-mixer', name: 'KI-Köder-Mischer', required_level: 5, unlocked: false, unlock_reason: 'locked' },
    ],
    unlocked_tools: ['dashboard', 'ki-buddy', 'logbook', 'profile', 'settings', 'fishing-map', 'catch-stats', 'weather', 'trip-planner'],
    purchased_tools: [],
    next_unlocks: [],
    pending_level_up: null,
    seen_level: 3,
    ...overrides,
  };
}

function Probe() {
  const p = useProgression();
  return (
    <div>
      <span data-testid="level">{p.level}</span>
      <span data-testid="rank">{p.rank}</span>
      <span data-testid="map">{String(p.isToolUnlocked('fishing-map'))}</span>
      <span data-testid="mixer">{String(p.isToolUnlocked('bait-mixer'))}</span>
      <span data-testid="page-map">{String(p.isPageUnlocked('Map'))}</span>
      <span data-testid="page-unknown">{String(p.isPageUnlocked('Impressum'))}</span>
      <span data-testid="loading">{String(p.loading)}</span>
      <button type="button" onClick={() => p.markToolUnlocked('bait-mixer')}>kaufen</button>
    </div>
  );
}

beforeEach(() => {
  apiMock.me = vi.fn(async () => response());
  apiMock.markLevelSeen = vi.fn(async () => ({ ok: true }));
});

afterEach(cleanup);

describe('ProgressionProvider', () => {
  it('übernimmt Level und Freischaltungen vom Server', async () => {
    render(<ProgressionProvider><Probe /></ProgressionProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('level')).toHaveTextContent('3');
    expect(screen.getByTestId('rank')).toHaveTextContent('Hakenheld');
    expect(screen.getByTestId('map')).toHaveTextContent('true');
    expect(screen.getByTestId('mixer')).toHaveTextContent('false');
  });

  it('leitet den Seiten-Status aus dem Katalog ab', async () => {
    render(<ProgressionProvider><Probe /></ProgressionProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('page-map')).toHaveTextContent('true');
    // Seiten ohne Katalog-Eintrag dürfen nie gesperrt sein.
    expect(screen.getByTestId('page-unknown')).toHaveTextContent('true');
  });

  it('schaltet ein gekauftes Tool sofort frei, ohne auf den Server zu warten', async () => {
    render(<ProgressionProvider><Probe /></ProgressionProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button', { name: 'kaufen' }).click();
    });

    expect(screen.getByTestId('mixer')).toHaveTextContent('true');
  });

  it('fällt bei einem Fehler auf den Startzustand zurück statt hängen zu bleiben', async () => {
    apiMock.me = vi.fn(async () => { throw new Error('offline'); });
    render(<ProgressionProvider><Probe /></ProgressionProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('level')).toHaveTextContent('1');
    expect(screen.getByTestId('map')).toHaveTextContent('false');
    // Basis-Seiten bleiben trotzdem erreichbar.
    expect(screen.getByTestId('page-unknown')).toHaveTextContent('true');
  });

  it('lädt genau einmal, auch wenn mehrere Verbraucher hängen', async () => {
    render(
      <ProgressionProvider>
        <Probe />
        <Probe />
      </ProgressionProvider>
    );
    await waitFor(() => expect(apiMock.me).toHaveBeenCalled());
    expect(apiMock.me).toHaveBeenCalledTimes(1);
  });
});

describe('useProgression ohne Provider', () => {
  it('liefert den Startzustand statt zu werfen', () => {
    render(<Probe />);
    expect(screen.getByTestId('level')).toHaveTextContent('1');
    expect(screen.getByTestId('mixer')).toHaveTextContent('false');
    expect(screen.getByTestId('page-unknown')).toHaveTextContent('true');
  });
});
