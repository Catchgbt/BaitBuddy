import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const session = vi.hoisted(() => ({ user: null }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));
vi.mock('@/lib/ThemeContext', () => ({ useTheme: () => ({ animationsEnabled: false }) }));
vi.mock('./GeneralSettings', () => ({ default: () => <p>Allgemeine Einstellungen</p> }));
vi.mock('./AppearanceSettings', () => ({ default: () => null }));
vi.mock('./BatterySettings', () => ({ default: () => null }));
vi.mock('./VoiceSettings', () => ({ default: () => null }));
vi.mock('./TickerSettings', () => ({ default: () => null }));
vi.mock('./ActionNotificationSettings', () => ({ default: () => null }));
vi.mock('./DeleteAccountSection', () => ({ default: () => null }));
vi.mock('./BuddySettings', () => ({ default: () => null }));
vi.mock('./LocalAiSettings', () => ({ default: () => null }));
vi.mock('./NavigationSettings', () => ({ default: () => null }));
vi.mock('./FishingPreferencesSettings', () => ({ default: () => null }));
vi.mock('./OnboardingSettings', () => ({ default: () => null }));

const { default: SettingsPageTabbed } = await import('./SettingsPageTabbed');
afterEach(() => { cleanup(); session.user = null; });

function renderSettings(user) {
  session.user = user;
  return render(<MemoryRouter initialEntries={['/Settings']}>
    <Routes>
      <Route path="/Settings" element={<SettingsPageTabbed />} />
      <Route path="/Admin" element={<h1>Admin-Ziel</h1>} />
      <Route path="/Help" element={<h1>Hilfe-Ziel</h1>} />
    </Routes>
  </MemoryRouter>);
}

describe('Einstellungen — Hilfe und Admin-Zugang', () => {
  it('zeigt den Superuser-Link direkt unter Hilfe und navigiert zum Adminbereich', () => {
    renderSettings({ id: 'su', email: 'kaisaschnitt99@gmail.com', is_superuser: true });
    const help = screen.getByRole('link', { name: 'Hilfe' });
    const admin = screen.getByRole('link', { name: 'Admin-Bereich' });
    expect(help.nextElementSibling).toBe(admin);
    expect(admin).toHaveAttribute('href', '/Admin');
    fireEvent.click(admin);
    expect(screen.getByRole('heading', { name: 'Admin-Ziel' })).toBeInTheDocument();
  });

  it.each([
    { id: 'admin', is_admin: true, is_superuser: false },
    { id: 'unverified', email: 'kaisaschnitt99@gmail.com' },
    null,
  ])('zeigt ohne bestätigten Superuser-Status nur Hilfe', user => {
    renderSettings(user);
    expect(screen.queryByRole('link', { name: 'Admin-Bereich' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Hilfe' }));
    expect(screen.getByRole('heading', { name: 'Hilfe-Ziel' })).toBeInTheDocument();
  });
});
