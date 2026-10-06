import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeOverview from './HomeOverview';
import HomeWeatherRail from './HomeWeatherRail';

const gear = vi.hoisted(() => ({ list: vi.fn() }));
const weatherState = vi.hoisted(() => ({ current: null }));
vi.mock('@/api/frontendClient', () => ({ entities: { GearItem: { list: (...a) => gear.list(...a) } } }));
vi.mock('@/components/location/LocationManager', () => ({
  useLocation: () => ({ currentLocation: null, requestGpsLocation: vi.fn() }),
}));
vi.mock('@/hooks/useFishingConditions', () => ({
  useFishingConditions: () => weatherState.current || { hours: [], window: null, data: null, isLoading: false, hasLocation: false },
}));
vi.mock('@/components/onboarding/OnboardingFlow', () => ({ default: () => null }));
vi.mock('@/components/utils/SuspenseWithErrorBoundary', () => ({ default: ({ children }) => <>{children}</> }));
vi.mock('@/components/utils/tracker', () => ({ track: vi.fn() }));
vi.mock('@/components/dashboard/SchonzeitWarner', () => ({ default: () => null }));
vi.mock('@/components/dashboard/OfflineCacheIndicator', () => ({ default: () => null }));
vi.mock('@/components/dashboard/BuddyInsightCard', () => ({ default: () => null }));
vi.mock('@/components/dashboard/FishingRecommendationCard', () => ({ default: () => null }));
vi.mock('@/components/dashboard/AudioNotesWidget', () => ({ default: () => null }));

function setup(props = {}, weather = false) {
  gear.list.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {weather ? <HomeWeatherRail /> : <HomeOverview user={{ id: 'u1' }} {...props} />}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  weatherState.current = null;
});

describe('Aktuelles Dashboard', () => {
  it('zeigt sieben Tage aus der echten Forecast-Datenstruktur', () => {
    weatherState.current = {
      hours: [], window: null, hasLocation: false, isLoading: false,
      data: {
        timezone: 'Europe/Berlin',
        daily: {
          time: Array.from({ length: 7 }, (_, i) => 1790460000 + i * 86400),
          weather_code: [1, 2, 3, 61, 1, 2, 3],
          temperature_2m_min: [8, 9, 10, 11, 12, 13, 14],
          temperature_2m_max: [17, 18, 19, 20, 21, 22, 23],
        },
      },
    };
    setup({}, true);
    const forecast = screen.getByLabelText('Vorhersage für sieben Tage');
    expect(forecast.children).toHaveLength(7);
    expect(forecast).toHaveTextContent('Heute');
    expect(forecast).toHaveTextContent('23° / 14°');
  });

  it.each([
    { name: 'Zandertour Rhein', start_date: '2026-10-04T05:30:00.000Z' },
    { title: 'Hechttour', planned_date: '2026-10-04T05:30:00.000Z' },
  ])('zeigt die Tour aus dem Aggregat ohne weitere Trip-Abfrage: %o', async trip => {
    setup({ dashboardData: { next_trip: trip } });
    expect(screen.getByText(trip.name || trip.title)).toBeInTheDocument();
    await vi.waitFor(() => expect(gear.list).toHaveBeenCalledTimes(1));
    const buddyLink = screen.getByRole('link', { name: 'Mit Buddy' });
    expect(new URL(buddyLink.getAttribute('href'), 'https://baitbuddy.test').searchParams.get('question')).toContain(trip.name || trip.title);
  });

  it('zeigt ohne geplante Tour den leeren Zustand', () => {
    setup({ dashboardData: { next_trip: null } });
    expect(screen.getByText('Noch nichts geplant')).toBeInTheDocument();
  });

  it('unterscheidet einen Ladefehler von einer leeren Tour-Liste und erlaubt Retry', async () => {
    const onRetry = vi.fn();
    setup({ error: true, onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Dashboard-Daten konnten nicht geladen werden.');
    expect(screen.queryByText('Noch nichts geplant')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Erneut versuchen' })[0]);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
