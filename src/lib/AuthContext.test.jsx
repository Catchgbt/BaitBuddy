import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen, cleanup, act } from '@testing-library/react';
import React from 'react';

const { mockAuth, mockSupabaseAuth, authStateCallback } = vi.hoisted(() => ({
  mockAuth: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearCachedUser: vi.fn(),
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

import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { logout, user, isAuthenticated } = useAuth();
  return <><span>{isAuthenticated ? user?.id : 'guest'}</span><button type="button" onClick={() => logout(false)}>logout</button></>;
}

describe('AuthContext – Supabase-Token-Sync', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    mockAuth.getToken.mockReturnValue(null);
    mockAuth.setToken.mockClear();
    mockAuth.setRefreshToken.mockClear();
    mockAuth.clearCachedUser.mockClear();
    mockAuth.me.mockReset();
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

    authStateCallback.current('TOKEN_REFRESHED', {
      access_token: 'neues-token',
      refresh_token: 'neuer-refresh',
    });

    expect(mockAuth.setToken).toHaveBeenCalledWith('neues-token');
    expect(mockAuth.setRefreshToken).toHaveBeenCalledWith('neuer-refresh');
  });

  it('raeumt bb_token bei SIGNED_OUT auf', async () => {
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(authStateCallback.current).toBeTypeOf('function'));

    authStateCallback.current('SIGNED_OUT', null);

    expect(mockAuth.setToken).toHaveBeenCalledWith(null);
  });

  it('logout() ruft supabase.auth.signOut() auf (raeumt beide Sessions auf)', async () => {
    const { getByText } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(authStateCallback.current).toBeTypeOf('function'));

    getByText('logout').click();

    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    expect(mockAuth.setToken).toHaveBeenCalledWith(null);
  });

  it('übernimmt nach dem Logout kein verspätetes Profil mehr in die UI', async () => {
    mockAuth.getToken.mockReturnValue('token');
    let finishMe;
    mockAuth.me.mockImplementation(() => new Promise(resolve => { finishMe = resolve; }));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => { screen.getByText('logout').click(); });
    await act(async () => { finishMe({ id: 'old-user' }); });

    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.queryByText('old-user')).not.toBeInTheDocument();
  });

  it('räumt bei SIGNED_OUT auch den UI-Status und den Profilcache auf', async () => {
    mockAuth.getToken.mockReturnValue('token');
    mockAuth.me.mockResolvedValue({ id: 'user-1' });
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await screen.findByText('user-1');
    await act(async () => { authStateCallback.current('SIGNED_OUT', null); });

    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(mockAuth.clearCachedUser).toHaveBeenCalled();
  });
});
