import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Gleiche Mocks wie im AIBuddyWidget-Test: Der Stub lädt das volle Widget als
// Lazy-Chunk nach, dessen schwere Abhängigkeiten hier nicht relevant sind.
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

import AIBuddyWidgetStub from './AIBuddyWidgetStub';

function renderStub(initialEntries = ['/Weather']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AIBuddyWidgetStub />
    </MemoryRouter>
  );
}

function tapAvatar() {
  const avatar = document.querySelector('.cursor-grab');
  expect(avatar).toBeTruthy();
  fireEvent.touchStart(avatar, { touches: [{ clientX: 200, clientY: 400 }] });
  fireEvent.touchEnd(avatar, { changedTouches: [{ clientX: 200, clientY: 400 }] });
}

describe('AIBuddyWidgetStub – erster Klick öffnet den Chat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('öffnet den vollen Chat schon beim ERSTEN Tap auf den Avatar (nicht erst beim zweiten)', async () => {
    // Seite als besucht markieren, damit keine Frage-Blase dazwischenfunkt.
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub();
    tapAvatar();

    // Der Chat (Eingabefeld) muss nach dem einen Tap sichtbar sein — vorher
    // lud der erste Tap nur den Widget-Chunk nach und der Chat blieb zu.
    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('öffnet den Chat per Maus-Klick auf den Avatar', async () => {
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub();
    const avatar = document.querySelector('.cursor-grab');
    fireEvent.mouseDown(avatar, { clientX: 200, clientY: 400 });
    fireEvent.mouseUp(document);

    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('lässt den frisch geöffneten Chat durch Geister-Mausevents NICHT wieder zufallen', async () => {
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub();
    tapAvatar();
    await screen.findByLabelText('Chat-Eingabefeld');

    // Nach dem Stub→Widget-Wechsel treffen die vom Browser synthetisierten
    // Kompatibilitäts-Mausevents den NEUEN Avatar. Der Guard muss den
    // Tap-Zeitstempel aus dem Stub übernommen haben.
    const avatar = document.querySelector('.cursor-grab');
    fireEvent.mouseDown(avatar, { clientX: 200, clientY: 400 });
    fireEvent.mouseUp(document);

    expect(screen.getByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('zeigt beim ersten Besuch einer Seite die seitenspezifische Frage-Blase (ohne Widget-Chunk)', async () => {
    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');

    // Der volle Chat ist dabei noch NICHT geladen/offen.
    expect(screen.queryByLabelText('Chat-Eingabefeld')).not.toBeInTheDocument();
  });

  it('öffnet den vollen Chat beim Tippen auf die Frage-Blase', async () => {
    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    fireEvent.click(bubble);

    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('zeigt keine Frage-Blase auf bereits besuchten Seiten', async () => {
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub(['/Weather']);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(screen.queryByLabelText('Chat mit Jule öffnen')).not.toBeInTheDocument();
  });
});
