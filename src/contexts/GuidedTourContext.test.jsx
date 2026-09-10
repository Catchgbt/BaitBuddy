import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import React from 'react';

const { api, authState } = vi.hoisted(() => ({
  api: { tour: null, updateTour: null },
  authState: { user: { id: 'user-1' } },
}));

vi.mock('@/api/frontendClient', () => ({
  progression: {
    tour: (...a) => api.tour(...a),
    updateTour: (...a) => api.updateTour(...a),
  },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

import { GuidedTourProvider, useGuidedTour } from './GuidedTourContext';

function Probe() {
  const t = useGuidedTour();
  return (
    <div>
      <span data-testid="loading">{String(t.isLoading)}</span>
      <span data-testid="level">{t.userLevel}</span>
      <span data-testid="completed">{String(t.tutorialCompleted)}</span>
      <span data-testid="step">{t.currentStep}</span>
      <span data-testid="active">{String(t.isActive)}</span>
      <button type="button" onClick={() => t.startTour()}>start</button>
      <button type="button" onClick={() => t.completeTour()}>complete</button>
      <button type="button" onClick={() => t.setUserLevelDirectly('professional')}>level</button>
    </div>
  );
}

function renderProbe() {
  return render(<GuidedTourProvider><Probe /></GuidedTourProvider>);
}

beforeEach(() => {
  authState.user = { id: 'user-1' };
  api.tour = vi.fn(async () => ({ ok: true, step: 0, completed: false, user_level: 'beginner' }));
  api.updateTour = vi.fn(async () => ({ ok: true }));
});
afterEach(cleanup);

describe('GuidedTourContext', () => {
  it('lädt den Tour-Zustand über das Backend, nicht über Supabase', async () => {
    api.tour = vi.fn(async () => ({ ok: true, step: 3, completed: true, user_level: 'experienced' }));
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(api.tour).toHaveBeenCalledOnce();
    expect(screen.getByTestId('level')).toHaveTextContent('experienced');
    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    expect(screen.getByTestId('step')).toHaveTextContent('3');
  });

  it('schreibt den Abschluss über das Backend', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => { screen.getByRole('button', { name: 'complete' }).click(); });

    expect(api.updateTour).toHaveBeenCalledWith({ step: 0, completed: true });
    expect(screen.getByTestId('completed')).toHaveTextContent('true');
  });

  it('speichert einen Level-Wechsel', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => { screen.getByRole('button', { name: 'level' }).click(); });

    expect(api.updateTour).toHaveBeenCalledWith({ user_level: 'professional' });
    expect(screen.getByTestId('level')).toHaveTextContent('professional');
  });

  it('startet die Tour nicht erneut, wenn sie abgeschlossen ist', async () => {
    api.tour = vi.fn(async () => ({ ok: true, step: 0, completed: true, user_level: 'beginner' }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });

    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('läuft bei einem Ladefehler nicht ungefragt los', async () => {
    // Fällt der Abruf aus (offline, Serverfehler), darf die Tour nicht bei
    // jedem Verbindungsproblem erneut starten.
    api.tour = vi.fn(async () => { throw new Error('offline'); });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    errSpy.mockRestore();
  });

  it('bricht eine laufende Tour nicht ab, wenn das Speichern scheitert', async () => {
    api.updateTour = vi.fn(async () => { throw new Error('500'); });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
    expect(screen.getByTestId('active')).toHaveTextContent('true');

    await act(async () => { screen.getByRole('button', { name: 'complete' }).click(); });
    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    errSpy.mockRestore();
  });

  it('fragt ohne angemeldeten Nutzer gar nicht erst', async () => {
    authState.user = null;
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(api.tour).not.toHaveBeenCalled();
  });
});
