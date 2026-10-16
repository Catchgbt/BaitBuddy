import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const authMock = vi.hoisted(() => ({
  me: vi.fn(),
  updateMe: vi.fn(),
}));
const planState = vi.hoisted(() => ({ allToolsFree: false }));

vi.mock('@/api/auth', () => ({ auth: authMock }));
vi.mock('@/api/frontendClient', () => ({
  functions: { invoke: vi.fn(async () => ({ plan: { id: 'free', name: 'Free' } })) },
  entities: {
    Post: { filter: vi.fn(async () => []) },
    ChatMessage: { list: vi.fn(async () => []) },
  },
}));
vi.mock('@/integrations/Core', () => ({ UploadFile: vi.fn() }));
vi.mock('@/components/feedback/RatingWidget', () => ({ default: () => null }));
vi.mock('@/components/settings/DeleteAccountDialog', () => ({ default: () => null }));
vi.mock('@/hooks/useFeatureTracking', () => ({ useFeatureTracking: () => {} }));
vi.mock('@/components/premium/PlanContext', () => ({ usePlan: () => planState }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const { default: ProfilePage } = await import('./Profile');

function renderProfile() {
  return render(<MemoryRouter><ProfilePage /></MemoryRouter>);
}

describe('Profil – Name ändern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planState.allToolsFree = false;
    authMock.me.mockResolvedValue({ id: 'u1', email: 'a@b.de', nickname: 'Basti', referral_code: 'ABCDEFGH' });
    authMock.updateMe.mockImplementation(async (data) => ({ id: 'u1', email: 'a@b.de', referral_code: 'ABCDEFGH', ...data }));
  });

  afterEach(() => cleanup());

  // Regression: Das Öffnen des Bearbeiten-Modus warf einen ReferenceError
  // (isSaving war nicht deklariert) — der Name ließ sich nie ändern.
  it('öffnet den Bearbeiten-Modus und speichert den neuen Namen', async () => {
    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: 'Name bearbeiten' }));
    const input = screen.getByLabelText('Anzeigename');
    expect(input).toHaveValue('Basti');

    fireEvent.change(input, { target: { value: '  Sebastian   K.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(authMock.updateMe).toHaveBeenCalledWith({ nickname: 'Sebastian K.' }));
    expect(await screen.findByRole('heading', { name: 'Sebastian K.' })).toBeInTheDocument();
  });

  it('speichert keinen leeren Namen', async () => {
    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: 'Name bearbeiten' }));
    fireEvent.change(screen.getByLabelText('Anzeigename'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(authMock.updateMe).not.toHaveBeenCalled();
  });

  it('zeigt den vollen Namen, wenn noch kein Anzeigename gesetzt ist', async () => {
    authMock.me.mockResolvedValue({ id: 'u1', email: 'a@b.de', full_name: 'Sebastian Muster', referral_code: 'ABCDEFGH' });
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Sebastian Muster' })).toBeInTheDocument();
  });

  it('zeigt Free weiterhin an, wenn alle Funktionen global freigeschaltet sind', async () => {
    planState.allToolsFree = true;
    renderProfile();

    expect(await screen.findByText('Free-Modus aktiv')).toBeInTheDocument();
    expect(screen.getByText(/Dein Tarif bleibt Free/)).toBeInTheDocument();
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
  });
});
