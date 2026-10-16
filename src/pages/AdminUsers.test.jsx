import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'admin', is_admin: true }, isLoadingAuth: false },
  get: vi.fn(),
  invoke: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => mocks.session }));
vi.mock('@/api/frontendClient', () => ({ api: { get: mocks.get }, functions: { invoke: mocks.invoke } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.error } }));
vi.mock('@/components/ui/input', () => ({ Input: props => <input {...props} /> }));
vi.mock('@/components/ui/mobile-select', () => ({
  MobileSelect: ({ value, onValueChange, options }) => (
    <select aria-label="Plan" value={value} onChange={e => onValueChange(e.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

import AdminUsers from './AdminUsers';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session = { user: { id: 'admin', is_admin: true }, isLoadingAuth: false };
  mocks.get.mockResolvedValue([{ id: 'u1', email: 'angler@example.test', premium_plan_id: 'free' }]);
  mocks.invoke.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe('AdminUsers', () => {
  it('lässt Admins ohne erfundenes role-Feld auf die Nutzerliste zugreifen', async () => {
    render(<AdminUsers />);
    expect(await screen.findByText('angler@example.test')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it.each([null, { id: 'u2', is_admin: false }])('sperrt unberechtigte Konten ohne Nutzeranfrage', user => {
    mocks.session.user = user;
    render(<AdminUsers />);
    expect(screen.getByText('Kein Zugriff. Nur Admins.')).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('zeigt einen Ladefehler und ermöglicht einen erneuten Versuch', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Dienst nicht erreichbar'));
    const user = userEvent.setup();
    render(<AdminUsers />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Dienst nicht erreichbar');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByText('angler@example.test')).toBeInTheDocument();
  });

  it('sendet Ultimate mit der gültigen Plan-ID und lehnt eine leere Laufzeit ab', async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);
    await user.click(await screen.findByRole('button', { name: 'Plan zuweisen' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Plan' }), 'elite');
    await user.clear(screen.getByRole('spinbutton'));
    await user.click(screen.getAllByRole('button', { name: 'Plan zuweisen' })[0]);
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Bitte eine ganze Laufzeit zwischen 1 und 365 Tagen eingeben');
    await user.type(screen.getByRole('spinbutton'), '30');
    await user.click(screen.getAllByRole('button', { name: 'Plan zuweisen' })[0]);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('adminAssignPlan', {
      target_user_id: 'u1', plan_id: 'elite', duration_days: 30,
    }));
  });
});
