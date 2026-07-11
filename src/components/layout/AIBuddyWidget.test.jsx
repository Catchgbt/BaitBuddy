import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Schwere/irrelevante Abhängigkeiten mocken, damit der Test das Verhalten der
// Chat-Logik isoliert prüft (KI-Buddy: robuste Fehlerbehandlung + Voice-Setting).
vi.mock('@/components/ai/JuleAvatar', () => ({
  default: () => <div data-testid="jule-avatar" />,
}));
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('@/utils/buddyActions', () => ({
  executeBuddyAction: vi.fn(async () => ({})),
}));
vi.mock('@/components/utils/elevenLabsTTS', () => ({
  speakWithFallback: vi.fn(async () => {}),
}));
vi.mock('@/components/utils/browserTTS', () => ({
  speakWithBrowserTTS: vi.fn(async () => {}),
}));
vi.mock('@/lib/offlineBuddyQuestions', () => ({
  findOfflineBuddyAnswer: vi.fn(() => null),
  getOfflineBuddyFallback: vi.fn(() => 'OFFLINE_FALLBACK_ANTWORT'),
}));
vi.mock('@/api/frontendClient', () => ({
  ai: { chat: vi.fn() },
}));

import AIBuddyWidget from './AIBuddyWidget';
import { ai } from '@/api/frontendClient';
import { speakWithFallback } from '@/components/utils/elevenLabsTTS';

function renderWidget(initialEntries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AIBuddyWidget />
    </MemoryRouter>
  );
}

// Der volle Chat öffnet sich nicht mehr automatisch – ein Tap auf den Avatar
// klappt ihn auf.
function openChatViaAvatar() {
  const avatar = document.querySelector('.cursor-grab');
  fireEvent.touchStart(avatar, { touches: [{ clientX: 200, clientY: 400 }] });
  fireEvent.touchEnd(avatar, { changedTouches: [{ clientX: 200, clientY: 400 }] });
}

async function sendMessage(text) {
  openChatViaAvatar();
  const input = await screen.findByLabelText('Chat-Eingabefeld');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('AIBuddyWidget – Chat-Verhalten', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // jsdom implementiert scrollIntoView nicht.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('spricht die Antwort NICHT, wenn die Stimme deaktiviert ist (B4)', async () => {
    localStorage.setItem('buddy-voice-enabled', 'false');
    ai.chat.mockResolvedValue({ reply: 'Hechte beißen morgens.' });

    renderWidget();
    await sendMessage('Wann beißen Hechte?');

    expect(await screen.findByText('Hechte beißen morgens.')).toBeInTheDocument();
    expect(speakWithFallback).not.toHaveBeenCalled();
  });

  it('spricht die Antwort, wenn die Stimme aktiviert ist', async () => {
    localStorage.setItem('buddy-voice-enabled', 'true');
    ai.chat.mockResolvedValue({ reply: 'Petri Heil!' });

    renderWidget();
    await sendMessage('Gruß?');

    await screen.findByText('Petri Heil!');
    await waitFor(() => expect(speakWithFallback).toHaveBeenCalled());
    expect(speakWithFallback).toHaveBeenCalledWith(
      expect.stringContaining('Petri Heil!'),
      expect.objectContaining({ voiceEnabled: true })
    );
  });

  it('fällt bei einem API-Fehler auf die Offline-Antwort zurück (nie stumm)', async () => {
    ai.chat.mockRejectedValue(new Error('network down'));

    renderWidget();
    await sendMessage('Frage ohne Netz');

    expect(await screen.findByText('OFFLINE_FALLBACK_ANTWORT')).toBeInTheDocument();
  });

  it('öffnet den Chat bei einem Tap und lässt ihn durch Geister-Mausevents NICHT wieder zufallen', async () => {
    // Der Tap erfolgt sofort nach dem Rendern — die Frage-Blase (800 ms
    // Verzögerung) kommt dem Test nicht in die Quere, weil der offene Chat
    // sie unterdrückt.
    const { container } = renderWidget();

    // Der Avatar-Wrapper trägt die Drag-/Klick-Handler (cursor-grab).
    const avatar = container.querySelector('.cursor-grab');
    expect(avatar).toBeTruthy();

    // Tap: touchstart -> touchend öffnet den Chat.
    fireEvent.touchStart(avatar, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(avatar, { changedTouches: [{ clientX: 200, clientY: 400 }] });

    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();

    // Vom Browser nachgereichte Kompatibilitäts-Mausevents (Ghost-Click) dürfen
    // den soeben geöffneten Chat nicht sofort wieder schließen.
    fireEvent.mouseDown(avatar, { clientX: 200, clientY: 400 });
    fireEvent.mouseUp(document);

    expect(screen.getByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('meldet sich beim Öffnen einer Seite mit einer seitenspezifischen Frage in der kleinen Blase', async () => {
    renderWidget(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');

    // Der volle Chat ist dabei noch NICHT offen.
    expect(screen.queryByLabelText('Chat-Eingabefeld')).not.toBeInTheDocument();
  });

  it('stellt die Frage auch auf Seiten, die früher schon besucht wurden', async () => {
    // Altbestand aus der früheren "nur beim ersten Besuch"-Logik darf die
    // Blase nicht mehr unterdrücken.
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderWidget(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');
  });

  it('öffnet den vollen Chat, wenn man auf die kleine Frage-Blase tippt', async () => {
    renderWidget(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    fireEvent.click(bubble);

    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });
});
