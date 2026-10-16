import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  allToolsFree: false,
  plans: [],
  fail: false,
}));

vi.mock('@/components/premium/PlanContext', () => ({
  usePlan: () => ({ allToolsFree: state.allToolsFree }),
}));
vi.mock('@/entities/FishingPlan', () => ({
  FishingPlan: {
    list: vi.fn(async () => {
      if (state.fail) throw new Error('Verbindung nicht verfügbar');
      return state.plans;
    }),
  },
}));

const { default: HeaderModeStatus } = await import('./HeaderModeStatus');

beforeEach(() => {
  state.allToolsFree = false;
  state.plans = [];
  state.fail = false;
});
afterEach(() => cleanup());

function showStatus() {
  return render(
    <MemoryRouter>
      <HeaderModeStatus user={{ id: 'angler-1' }} />
    </MemoryRouter>,
  );
}

describe('Dashboard-Status im Header', () => {
  it('zeigt die globale Freischaltung auch beim Free-Plan und verlinkt den Start', async () => {
    state.allToolsFree = true;
    showStatus();
    expect(screen.getByText('Alle Funktionen frei')).toBeInTheDocument();
    const start = await screen.findByRole('link', { name: 'Angelmodus starten – Trip planen' });
    expect(start).toHaveAttribute('href', '/TripPlanner');
  });

  it('meldet einen aktiven Angelmodus ausschließlich für aktive Trips', async () => {
    state.plans = [{ id: 'trip-1', is_active: true }];
    showStatus();
    const active = await screen.findByRole('link', { name: 'Angelmodus aktiv – öffnen' });
    expect(active).toHaveAttribute('href', '/AnglerMode');
    expect(screen.queryByText('Alle Funktionen frei')).not.toBeInTheDocument();
  });

  it('übernimmt den Trip-Status unmittelbar nach dem Aktualisierungsereignis', async () => {
    showStatus();
    await screen.findByRole('link', { name: 'Angelmodus starten – Trip planen' });
    state.plans = [{ id: 'trip-2', is_active: true }];
    await act(async () => {
      window.dispatchEvent(new Event('active-trips-updated'));
    });
    expect(await screen.findByRole('link', { name: 'Angelmodus aktiv – öffnen' })).toHaveAttribute('href', '/AnglerMode');
  });

  it('behauptet bei einem Ladefehler keinen inaktiven Angelmodus', async () => {
    state.allToolsFree = true;
    state.fail = true;
    showStatus();
    expect(screen.getByText('Alle Funktionen frei')).toBeInTheDocument();
    await act(async () => {});
    expect(screen.queryByRole('link', { name: /Angelmodus/ })).not.toBeInTheDocument();
  });
});
