import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@/api/supabaseClient', () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
}));

function SessionState() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  return <span>{isLoadingAuth ? 'loading' : isAuthenticated ? 'signed-in' : 'ready'}</span>;
}
const response = (status, body) => ({ ok: status === 200, status, json: async () => body });

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('bb_token', 'expired');
  localStorage.setItem('bb_refresh', 'valid-refresh');
});

describe('AuthProvider mit echtem API-Refresh', () => {
  it.each([429, 500, 503])('löscht bei vorübergehendem Refresh-Fehler %i keine Anmeldedaten', async status => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(401, { error: 'expired' }))
      .mockResolvedValueOnce(response(status, { error: 'temporarily unavailable' })));
    render(<AuthProvider><SessionState /></AuthProvider>);
    await screen.findByText('ready');
    expect(localStorage.getItem('bb_token')).toBe('expired');
    expect(localStorage.getItem('bb_refresh')).toBe('valid-refresh');
  });

  it('hält das gecachte Konto beim Netzwerkausfall während des Refresh angemeldet', async () => {
    localStorage.setItem('bb_user', JSON.stringify({ id: 'u1' }));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(401, { error: 'expired' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')));
    render(<AuthProvider><SessionState /></AuthProvider>);
    await screen.findByText('signed-in');
    expect(localStorage.getItem('bb_refresh')).toBe('valid-refresh');
  });

  it('verwirft einen endgültig abgelehnten Refresh-Token', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(401, { error: 'expired' }))
      .mockResolvedValueOnce(response(401, { error: 'invalid refresh' })));
    render(<AuthProvider><SessionState /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(localStorage.getItem('bb_token')).toBeNull();
    expect(localStorage.getItem('bb_refresh')).toBeNull();
  });
});
