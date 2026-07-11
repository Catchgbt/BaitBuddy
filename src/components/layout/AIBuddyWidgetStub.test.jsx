import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
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

function NavigateButton({ to }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {`navigiere-${to}`}
    </button>
  );
}

function renderStub(initialEntries = ['/Weather'], { withNavTo } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AIBuddyWidgetStub />
      {withNavTo && <NavigateButton to={withNavTo} />}
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
    renderStub();
    tapAvatar();

    // Der Chat (Eingabefeld) muss nach dem einen Tap sichtbar sein — vorher
    // lud der erste Tap nur den Widget-Chunk nach und der Chat blieb zu.
    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('öffnet den Chat per Maus-Klick auf den Avatar', async () => {
    renderStub();
    const avatar = document.querySelector('.cursor-grab');
    fireEvent.mouseDown(avatar, { clientX: 200, clientY: 400 });
    fireEvent.mouseUp(document);

    expect(await screen.findByLabelText('Chat-Eingabefeld')).toBeInTheDocument();
  });

  it('lässt den frisch geöffneten Chat durch Geister-Mausevents NICHT wieder zufallen', async () => {
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

  it('zeigt beim Öffnen einer Seite die seitenspezifische Frage-Blase (ohne Widget-Chunk)', async () => {
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

  it('zeigt die Frage-Blase auch auf Seiten, die früher schon besucht wurden', async () => {
    // Altbestand aus der früheren "nur beim ersten Besuch"-Logik darf die
    // Blase nicht mehr unterdrücken.
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');
  });

  it('zeigt bei jedem Seitenwechsel erneut die Frage zur neuen Funktion', async () => {
    renderStub(['/Weather'], { withNavTo: '/Map' });

    const bubble = await screen.findByLabelText('Chat mit Jule öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');

    fireEvent.click(screen.getByText('navigiere-/Map'));

    await screen.findByText(
      'Möchtest du hier einen neuen Angel-Spot eintragen?',
      {},
      { timeout: 3000 }
    );
  });
});
