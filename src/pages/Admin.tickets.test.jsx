import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const tickets = [
  { id: 't1', subject: 'App startet nicht', user_name: 'Anglerin',
    user_email: 'anglerin@baitbuddy.test', category: 'bug',
    created_date: '2026-10-16T08:00:00Z', message: 'App schließt sich.',
    status: 'offen', admin_response: '' },
];

const authMock = { user: { email: 'kaisaschnitt99@gmail.com', is_superuser: true }, isLoadingAuth: false };
const adminMock = {
  tickets: vi.fn(async ({ page }) => ({
    tickets: page === 2 ? [{ ...tickets[0], id: 't2', subject: 'Zweites Ticket' }] : tickets,
    total: 51, page, page_size: 50,
  })),
  updateTicket: vi.fn(async (_id, patch) => ({ ticket: { ...tickets[0], ...patch }, emailed: true })),
  deleteTicket: vi.fn(async () => ({ ok: true })),
  stats: vi.fn(() => new Promise(() => {})),
};

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('@/api/frontendClient', () => ({ superAdmin: adminMock }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const { default: Admin } = await import('./Admin');

function renderInbox() {
  return render(<MemoryRouter initialEntries={['/Admin?tab=tickets']}><Admin /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.user = { email: 'kaisaschnitt99@gmail.com', is_superuser: true };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Superuser ticket inbox', () => {
  it('opens the Tickets tab by URL and shows customer tickets', async () => {
    renderInbox();
    expect(await screen.findByRole('heading', { name: 'App startet nicht' })).toBeInTheDocument();
    expect(screen.getByText('App schließt sich.')).toBeInTheDocument();
    expect(screen.getByText('anglerin@baitbuddy.test')).toBeInTheDocument();
    expect(adminMock.tickets).toHaveBeenCalledWith({ page: 1, status: 'open', search: '' });
  });

  it('searches, filters and paginates the server list', async () => {
    const user = userEvent.setup();
    renderInbox();
    await screen.findByRole('heading', { name: 'App startet nicht' });
    await user.type(screen.getByRole('searchbox', { name: 'Tickets suchen' }), 'Anglerin');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));
    await waitFor(() => expect(adminMock.tickets).toHaveBeenCalledWith({ page: 1, status: 'open', search: 'Anglerin' }));
    await user.click(screen.getByRole('button', { name: 'Alle' }));
    await waitFor(() => expect(adminMock.tickets).toHaveBeenCalledWith({ page: 1, status: 'all', search: 'Anglerin' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await waitFor(() => expect(adminMock.tickets).toHaveBeenCalledWith({ page: 2, status: 'all', search: 'Anglerin' }));
    expect(await screen.findByRole('heading', { name: 'Zweites Ticket' })).toBeInTheDocument();
  });

  it('saves replies and status changes in the same support ticket', async () => {
    const user = userEvent.setup();
    renderInbox();
    const card = (await screen.findByRole('heading', { name: 'App startet nicht' })).closest('li');
    await user.type(within(card).getByRole('textbox', { name: /Antwort/ }), 'Bitte die App aktualisieren.');
    await user.selectOptions(within(card).getByRole('combobox', { name: 'Status' }), 'in_bearbeitung');
    await user.click(within(card).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(adminMock.updateTicket).toHaveBeenCalledWith('t1', {
      status: 'in_bearbeitung', admin_response: 'Bitte die App aktualisieren.',
    }));
  });

  it('does not display the ticket inbox to non-superusers', async () => {
    authMock.user = { email: 'normal@baitbuddy.test', is_superuser: false };
    renderInbox();
    expect(await screen.findByText('Kein Zugriff')).toBeInTheDocument();
    expect(adminMock.tickets).not.toHaveBeenCalled();
  });
});
