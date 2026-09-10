import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/entities/User', () => ({
  User: { me: vi.fn(async () => ({ id: 'user-1', plan: 'elite' })) },
  default: { me: vi.fn(async () => ({ id: 'user-1', plan: 'elite' })) },
}));

vi.mock('@/entities/FishingPlan', () => ({
  FishingPlan: {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
}));

vi.mock('@/api/frontendClient', () => ({
  analytics: { track: vi.fn() },
  events: { getActiveEvent: vi.fn(async () => ({})) },
}));

vi.mock('@/hooks/useEventActivityTracking', () => ({
  useEventActivityTracking: () => ({ trackTripFinish: vi.fn() }),
}));

vi.mock('@/hooks/useFeatureTracking', () => ({
  useFeatureTracking: () => {},
  default: () => {},
}));

vi.mock('@/components/location/LocationManager', () => ({
  useLocation: () => ({ currentLocation: null }),
}));

// Der Trip-Planer hängt seit dem Tool-Unlock-System am ToolGuard (Level 3).
// Für diesen Test zählt nur das Formular-Verhalten, nicht die Freischaltung.
vi.mock('@/components/progression/ToolGuard', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/LiveTrip/TripLiveTicker', () => ({
  default: () => <div data-testid="live-ticker" />,
}));

vi.mock('@/components/LiveTrip/TripForm', () => ({
  default: ({ onClose }) => (
    <div data-testid="trip-form">
      Trip-Formular
      <button type="button" onClick={onClose}>Schliessen</button>
    </div>
  ),
}));

import TripPlanner from './TripPlanner';

describe('TripPlanner – Grüne Buttons öffnen das Trip-Formular', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('öffnet das Formular über "Ersten Trip planen", wenn noch keine Trips existieren', async () => {
    const user = userEvent.setup();
    render(<TripPlanner />);

    await waitFor(() => expect(screen.getByText('Noch keine Trips geplant')).toBeInTheDocument());
    expect(screen.queryByTestId('trip-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ersten Trip planen/i }));

    expect(await screen.findByTestId('trip-form')).toBeInTheDocument();
  });

  it('öffnet das Formular über den "Neuer Trip"-Button oben, wenn noch keine Trips existieren', async () => {
    const user = userEvent.setup();
    render(<TripPlanner />);

    await waitFor(() => expect(screen.getByText('Noch keine Trips geplant')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^Neuer Trip$/i }));

    expect(await screen.findByTestId('trip-form')).toBeInTheDocument();
  });
});
