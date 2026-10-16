import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';

const { mockAuth, mockSupabaseAuth, authStateCallback } = vi.hoisted(() => ({
  mockAuth: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    setRefreshToken: vi.fn(),
    me: vi.fn(),
  },
  mockSupabaseAuth: { signOut: vi.fn(async () => ({ error: null })) },
  authStateCallback: { current: null },
}));

vi.mock('@/api/auth', () => ({ auth: mockAuth }));
vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    auth: {
      ...mockSupabaseAuth,
      onAuthStateChange: vi.fn((cb) => {
        authStateCallback.current = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

vi.mock('@/lib/guestStore', async (importOriginal) => ({
  // frontendClient verwendet weitere guestStore-Funktionen; Originalexporte
  // erhalten, damit der Test nur den Migrationspfad simuliert.
  ...(await importOriginal()),
  hasGuestData: vi.fn(() => false),
  migrateGuestData: vi.fn(async () => ({ migrated: 0, failed: 0, byEntity: {} })),
}));

import { hasGuestData, migrateGuestData } from './guestStore';
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { logout } = useAuth();
  return <button type="button" onClick={() => logout(false)}>logout</button>;
}

function AuthStatus() {
  const { user, isLoadingAuth } = useAuth();
  return <span data-testid="auth-status">{isLoadingAuth ? 'loading' : user?.email || 'guest'}</span>;
}

describe('AuthContext – Supabase-Token-Sync', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    mockAuth.getToken.mockImplementation(() => localStorage.getItem('bb_token'));
    mockAuth.setToken.mockImplementation(token => {
      if (token) localStorage.setItem('bb_token', token);
      else localStorage.removeItem('bb_token');
    });
    mockAuth.me.mockReset().mockResolvedValue({ id: 'u1', email: 'angler@example.test' });
    vi.mocked(hasGuestData).mockReset().mockReturnValue(false);
    vi.mocked(migrateGuestData).mockReset().mockResolvedValue({ migrated: 0, failed: 0, byEntity: {} });
    mockAuth.setToken.mockClear();
    mockAuth.setRefreshToken.mockClear();
    mockSupabaseAuth.signOut.mockClear();
    authStateCallback.current = null;
  });

  it('registriert einen onAuthStateChange-Listener beim Mount', () => {
    render(<AuthProvider><div /></AuthProvider>);
    expect(authStateCallback.current).toBeTypeOf('function');
  });

  it('synct TOKEN_REFRESHED-Events in bb_token/bb_refresh', async () => {
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(authStateCallback.current).toBeTypeOf('function'));

    await act(async () => {
      authStateCallback.current('TOKEN_REFRESHED', {
        access_token: 'neues-token',
        refresh_token: 'neuer-refresh',
      });
    });

    expect(mockAuth.setToken).toHaveBeenCalledWith('neues-token');
    expect(mockAuth.setRefreshToken).toHaveBeenCalledWith('neuer-refresh');
  });

  it('raeumt bb_token bei SIGNED_OUT auf', async () => {
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(authStateCallback.current).toBeTypeOf('function'));

    await act(async () => {
      authStateCallback.current('SIGNED_IN', { access_token: 'oauth-token' });
      authStateCallback.current('SIGNED_OUT', null);
    });

    expect(mockAuth.setToken).toHaveBeenCalledWith(null);
  });

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT'])('lässt eine alte Browser-Session bei %s die erneuerte App-Sitzung nicht ändern', async event => {
    localStorage.setItem('bb_token', 'backend-refreshed-token');
    render(<AuthProvider><AuthStatus /></AuthProvider>);
    await waitFor(() => expect(mockAuth.me).toHaveBeenCalled());
    mockAuth.setToken.mockClear();
    mockAuth.setRefreshToken.mockClear();

    await act(async () => {
      authStateCallback.current('INITIAL_SESSION', { access_token: 'stale-oauth-token' });
      authStateCallback.current(event, event === 'SIGNED_OUT' ? null : {
        access_token: 'stale-oauth-token', refresh_token: 'stale-refresh',
      });
    });

    expect(mockAuth.setToken).not.toHaveBeenCalled();
    expect(mockAuth.setRefreshToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('bb_token')).toBe('backend-refreshed-token');
  });

  it('lädt das Konto nach einem verspäteten OAuth-Login ohne Neuladen', async () => {
    const { getByTestId } = render(<AuthProvider><AuthStatus /></AuthProvider>);
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('guest'));
    await act(async () => {
      authStateCallback.current('SIGNED_IN', { access_token: 'oauth-token', refresh_token: 'oauth-refresh' });
    });
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('angler@example.test'));
  });

  it('ignoriert eine Profilantwort, die erst nach dem Logout eintrifft', async () => {
    localStorage.setItem('bb_token', 'access');
    let finishProfile;
    mockAuth.me.mockImplementation(() => new Promise(resolve => { finishProfile = resolve; }));
    const { getByText, getByTestId } = render(<AuthProvider><TestConsumer /><AuthStatus /></AuthProvider>);
    await act(async () => { getByText('logout').click(); });
    await act(async () => { finishProfile({ id: 'u1', email: 'old@example.test' }); });
    expect(getByTestId('auth-status')).toHaveTextContent('guest');
  });

  it('löscht bei einer verspäteten 401-Antwort nicht den neuen Login-Token', async () => {
    localStorage.setItem('bb_token', 'old-token');
    let rejectProfile;
    mockAuth.me.mockImplementation(() => new Promise((_, reject) => { rejectProfile = reject; }));
    render(<AuthProvider><AuthStatus /></AuthProvider>);

    await waitFor(() => expect(mockAuth.me).toHaveBeenCalled());
    localStorage.setItem('bb_token', 'new-login-token');
    await act(async () => { rejectProfile({ status: 401 }); });

    expect(localStorage.getItem('bb_token')).toBe('new-login-token');
  });

  it('logout() ruft supabase.auth.signOut() auf (raeumt beide Sessions auf)', async () => {
    const { getByText } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(authStateCallback.current).toBeTypeOf('function'));

    getByText('logout').click();

    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    expect(mockAuth.setToken).toHaveBeenCalledWith(null);
  });

  it('übernimmt einen Logout aus einem anderen Tab und verwirft eine laufende Profilantwort', async () => {
    localStorage.setItem('bb_token', 'access');
    let finishProfile;
    mockAuth.me.mockImplementation(() => new Promise(resolve => { finishProfile = resolve; }));
    const { getByTestId } = render(<AuthProvider><AuthStatus /></AuthProvider>);
    await act(async () => {
      localStorage.removeItem('bb_token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'bb_token', oldValue: 'access' }));
      finishProfile({ id: 'u1', email: 'old@example.test' });
    });
    expect(getByTestId('auth-status')).toHaveTextContent('guest');
  });

  it('übernimmt einen Login aus einem anderen Tab', async () => {
    const { getByTestId } = render(<AuthProvider><AuthStatus /></AuthProvider>);
    await act(async () => {
      localStorage.setItem('bb_token', 'other-tab');
      window.dispatchEvent(new StorageEvent('storage', { key: 'bb_token', newValue: 'other-tab' }));
    });
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('angler@example.test'));
  });

  it('prüft die erhaltene Sitzung erneut, wenn das Netz zurückkehrt', async () => {
    localStorage.setItem('bb_token', 'access');
    mockAuth.me.mockRejectedValueOnce(new TypeError('offline'));
    const { getByTestId } = render(<AuthProvider><AuthStatus /></AuthProvider>);
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('guest'));
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('angler@example.test'));
  });

  it('ignoriert verspätete SDK-Anmeldungen nach einem expliziten Logout', async () => {
    const { getByText, getByTestId } = render(<AuthProvider><TestConsumer /><AuthStatus /></AuthProvider>);
    await act(async () => { getByText('logout').click(); });
    mockAuth.setToken.mockClear();
    await act(async () => {
      authStateCallback.current('SIGNED_IN', { access_token: 'stale', refresh_token: 'stale-refresh' });
    });
    expect(mockAuth.setToken).not.toHaveBeenCalled();
    expect(getByTestId('auth-status')).toHaveTextContent('guest');
  });
  it('gibt die App frei, obwohl die Gastdatenübernahme noch läuft', async () => {
    mockAuth.getToken.mockReturnValue('test-token');
    mockAuth.me.mockResolvedValue({ id: 'u1', email: 'superuser@example.test', is_superuser: true });
    vi.mocked(hasGuestData).mockReturnValue(true);
    vi.mocked(migrateGuestData).mockImplementation(() => new Promise(() => {}));

    const { getByTestId } = render(<AuthProvider><AuthStatus /></AuthProvider>);
    await waitFor(() => expect(getByTestId('auth-status')).toHaveTextContent('superuser@example.test'));
    expect(migrateGuestData).toHaveBeenCalledTimes(1);
  });

});

