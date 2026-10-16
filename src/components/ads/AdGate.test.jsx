import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AdGateProvider, useAdGate } from './AdGate';
import { loadAdConfig } from '@/lib/adConfig';
import { APP_SETTINGS_EVENT } from '@/lib/appSettings';
import { getActiveAdContexts, setAdContextActive } from '@/lib/adActiveContext';
import { trackAdEvent } from '@/lib/adAnalytics';

const state = vi.hoisted(() => ({ planId: 'free', loading: false, authenticated: false, config: {} }));

vi.mock('@/components/premium/PlanContext', () => ({
  usePlan: () => ({ plan: { id: state.planId }, loading: state.loading, allToolsFree: true }),
}));
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: state.authenticated }),
}));
vi.mock('@/lib/adConfig', () => ({
  getAdConfig: () => state.config,
  loadAdConfig: vi.fn(async () => state.config),
  updateAdConfig: patch => (state.config = { ...state.config, ...patch }),
}));
vi.mock('@/lib/adAnalytics', () => ({ trackAdEvent: vi.fn() }));
vi.mock('@/components/ads/InterstitialAd', () => ({ canShowInterstitial: () => true }));

function Probe() {
  const { pendingInterstitial, dismissInterstitial, bannerAllowed } = useAdGate();
  const navigate = useNavigate();
  return <>
    <div data-testid="pending">{pendingInterstitial ? `${pendingInterstitial.sourceTool}->${pendingInterstitial.targetPath}` : 'none'}</div>
    <div data-testid="banner">{String(bannerAllowed)}</div>
    <button onClick={() => navigate('/Map')}>Karte</button>
    <button onClick={() => navigate('/Weather')}>Wetter</button>
    <button onClick={() => navigate('/Login')}>Login</button>
    <button onClick={dismissInterstitial}>Schließen</button>
  </>;
}

function App({ path }) {
  return <MemoryRouter initialEntries={[path]}><AdGateProvider><Probe /></AdGateProvider></MemoryRouter>;
}

async function renderAt(path = '/Dashboard') {
  let view;
  await act(async () => { view = render(<App path={path} />); });
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  state.planId = 'free';
  state.loading = false;
  state.authenticated = false;
  state.config = { ads_enabled: true, basic_banner_enabled: true, guest_interstitial_enabled: true, guest_interstitial_cooldown_s: 0 };
});

afterEach(() => {
  cleanup();
  getActiveAdContexts().forEach(context => setAdContextActive(context, false));
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('AdGateProvider – Navigation und Hauptschalter', () => {
  it('zeigt kein Interstitial beim App-Start, erst beim Wechsel zwischen Haupttools', async () => {
    await renderAt();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('Karte'));
    expect(screen.getByTestId('pending')).toHaveTextContent('/Dashboard->/Map');
  });

  it('entfernt eine laufende Anzeige beim Abschalten und startet beim Einschalten keine neue', async () => {
    await renderAt();
    fireEvent.click(screen.getByText('Karte'));
    act(() => window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, { detail: { ads_enabled: false } })));
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    act(() => window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, { detail: { ads_enabled: true } })));
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('Wetter'));
    expect(screen.getByTestId('pending')).toHaveTextContent('/Map->/Weather');
  });

  it('übernimmt entfernte Admin-Änderungen ohne Neustart durch Polling', async () => {
    state.authenticated = true;
    state.config = { ...state.config, ads_enabled: false };
    await renderAt();
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
    state.config = { ...state.config, ads_enabled: true };
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(loadAdConfig).toHaveBeenLastCalledWith({ fresh: true });
    expect(screen.getByTestId('banner')).toHaveTextContent('true');
  });

  it('aktualisiert beim Wiederöffnen, fragt im Hintergrund nicht ab und räumt Listener auf', async () => {
    const view = await renderAt();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(loadAdConfig).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(loadAdConfig).toHaveBeenCalledTimes(2);
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(loadAdConfig).toHaveBeenCalledTimes(3);
    view.unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(loadAdConfig).toHaveBeenCalledTimes(3);
  });

  it('löst beim Aktualisieren der Konfiguration auf derselben Route keine Werbung aus', async () => {
    await renderAt();
    fireEvent.click(screen.getByText('Karte'));
    fireEvent.click(screen.getByText('Schließen'));
    state.config = { ...state.config, guest_interstitial_cooldown_s: 60 };
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    expect(trackAdEvent).toHaveBeenCalledTimes(1);
  });

  it('respektiert den einzelnen Banner-Schalter aus der Konfiguration', async () => {
    state.authenticated = true;
    state.config = { ...state.config, basic_banner_enabled: false };
    await renderAt();
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
    state.config = { ...state.config, basic_banner_enabled: true };
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('banner')).toHaveTextContent('true');
  });

  it('wartet auf den tatsächlichen Plan, bevor Banner erscheinen', async () => {
    state.authenticated = true;
    state.loading = true;
    const view = await renderAt();
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
    state.loading = false;
    state.planId = 'pro';
    view.rerender(<App path="/Dashboard" />);
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
  });

  it.each(['free', 'basic'])('zeigt Banner für %s auch bei „Alle Tools kostenlos“', async planId => {
    state.planId = planId;
    state.authenticated = true;
    await renderAt();
    expect(screen.getByTestId('banner')).toHaveTextContent('true');
  });

  it('entfernt ein Gast-Interstitial beim Wechsel auf einen werbefreien Plan', async () => {
    const view = await renderAt();
    fireEvent.click(screen.getByText('Karte'));
    state.authenticated = true;
    state.planId = 'pro';
    view.rerender(<App path="/Dashboard" />);
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
  });

  it('entfernt Werbung auf geschützten Routen', async () => {
    await renderAt();
    fireEvent.click(screen.getByText('Karte'));
    fireEvent.click(screen.getByText('Login'));
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    expect(screen.getByTestId('banner')).toHaveTextContent('false');
  });

  it('beendet ein Interstitial für eine geschützte Session und setzt es danach nicht fort', async () => {
    await renderAt();
    fireEvent.click(screen.getByText('Karte'));
    act(() => setAdContextActive('voice_session', true));
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
    act(() => setAdContextActive('voice_session', false));
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });
});
