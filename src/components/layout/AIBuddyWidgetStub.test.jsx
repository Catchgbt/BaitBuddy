import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import React from 'react';

// Gleiche Mocks wie im AIBuddyWidget-Test: Der Stub lädt das volle Widget als
// Lazy-Chunk nach, dessen schwere Abhängigkeiten hier nicht relevant sind.
vi.mock('@/components/ai/BuddyAvatar', () => ({
  default: () => <div data-testid="buddy-avatar" />,
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
  events: { getActiveEvent: vi.fn(), leaderboard: vi.fn() },
}));

import AIBuddyWidgetStub from './AIBuddyWidgetStub';
import { events } from '@/api/frontendClient';
import { speakWithFallback } from '@/components/utils/elevenLabsTTS';
import { LAST_GREETING_KEY } from '@/lib/buddyGreetings';
import { __resetAudioUnlock } from '@/lib/audioUnlock';

// Begrüßung unterdrücken = so tun, als sei gerade begrüßt worden (Cooldown aktiv).
function suppressGreeting() {
  localStorage.setItem(LAST_GREETING_KEY, String(Date.now()));
}

// Audio-Autoplay entsperren: eine Nutzer-Geste simulieren (Klick auf body,
// wird vom window-Capture-Listener in audioUnlock erfasst).
function unlockAudio() {
  fireEvent.click(document.body);
}

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
    __resetAudioUnlock();
    vi.clearAllMocks();
    // Start-Begrüßung als "schon gelaufen" markieren: Diese Tests prüfen das
    // Seiten-Frage-Verhalten isoliert (die Begrüßung ersetzt sonst die erste
    // Blase; sie hat unten ihren eigenen describe-Block).
    suppressGreeting();
    // Rotierende Seiten-Blase deterministisch auf die Seitenfrage festnageln
    // (roll < 0.5 → getQuestionForPage).
    vi.spyOn(Math, 'random').mockReturnValue(0);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('öffnet den vollen Chat schon beim ERSTEN Tap auf den Avatar (nicht erst beim zweiten)', async () => {
    renderStub();
    tapAvatar();

    // Der Chat (Eingabefeld) muss nach dem einen Tap sichtbar sein — vorher
    // lud der erste Tap nur den Widget-Chunk nach und der Chat blieb zu.
    // Timeout > Default: Der erste Lazy-Import des Widget-Moduls braucht auf
    // kalten CI-Runnern (Vitest-Transform) gelegentlich laenger als 1s.
    expect(
      await screen.findByLabelText('Chat-Eingabefeld', {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it('öffnet den Chat per Maus-Klick auf den Avatar', async () => {
    renderStub();
    const avatar = document.querySelector('.cursor-grab');
    fireEvent.mouseDown(avatar, { clientX: 200, clientY: 400 });
    fireEvent.mouseUp(document);

    expect(
      await screen.findByLabelText('Chat-Eingabefeld', {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it('lässt den frisch geöffneten Chat durch Geister-Mausevents NICHT wieder zufallen', async () => {
    renderStub();
    tapAvatar();
    await screen.findByLabelText('Chat-Eingabefeld', {}, { timeout: 5000 });

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

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');

    // Der volle Chat ist dabei noch NICHT geladen/offen.
    expect(screen.queryByLabelText('Chat-Eingabefeld')).not.toBeInTheDocument();
  });

  it('öffnet den vollen Chat beim Tippen auf die Frage-Blase', async () => {
    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    fireEvent.click(bubble);

    expect(
      await screen.findByLabelText('Chat-Eingabefeld', {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it('zeigt die Frage-Blase auch auf Seiten, die früher schon besucht wurden', async () => {
    // Altbestand aus der früheren "nur beim ersten Besuch"-Logik darf die
    // Blase nicht mehr unterdrücken.
    localStorage.setItem('buddy-visited-pages', JSON.stringify(['Weather']));

    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');
  });

  it('zeigt bei jedem Seitenwechsel erneut die Frage zur neuen Funktion', async () => {
    renderStub(['/Weather'], { withNavTo: '/Map' });

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');

    fireEvent.click(screen.getByText('navigiere-/Map'));

    await screen.findByText(
      'Möchtest du hier einen neuen Angel-Spot eintragen?',
      {},
      { timeout: 3000 }
    );
  });
});

describe('AIBuddyWidgetStub – Start-Begrüßung beim App-Start', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetAudioUnlock();
    vi.clearAllMocks();
    // Nach der Begrüßung rotiert die Seiten-Blase — deterministisch auf die
    // Seitenfrage festnageln (roll < 0.5).
    vi.spyOn(Math, 'random').mockReturnValue(0);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('begrüßt beim App-Start per Blase, das Audio kommt beim ersten Antippen — auch offline', async () => {
    events.getActiveEvent.mockRejectedValue(new Error('offline'));

    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    expect(bubble).not.toHaveTextContent('Soll ich dir sagen, ob das Wetter heute zum Angeln passt?');
    expect(bubble.textContent.length).toBeGreaterThan(20);

    // Autoplay-Policy: Ohne Nutzer-Geste wird das Audio zurückgestellt, nicht
    // sofort abgespielt.
    expect(speakWithFallback).not.toHaveBeenCalled();

    // Erste Geste (Tap) entsperrt und holt die gesprochene Begrüßung nach.
    unlockAudio();
    expect(speakWithFallback).toHaveBeenCalled();
  });

  it('baut das aktive Event in die Begrüßung ein', async () => {
    events.getActiveEvent.mockResolvedValue({
      active_event: { id: 'ev1', name: 'Hecht-Cup', days_left: 4 },
    });
    events.leaderboard.mockResolvedValue([]);

    renderStub(['/Weather']);

    const bubble = await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });
    expect(bubble).toHaveTextContent('Hecht-Cup');
  });

  it('begrüßt nicht erneut innerhalb des Cooldowns — beim Seitenwechsel kommt die Seiten-Frage', async () => {
    events.getActiveEvent.mockResolvedValue({ active_event: null });

    renderStub(['/Weather'], { withNavTo: '/Map' });

    await screen.findByLabelText('Chat mit dem KI-Buddy öffnen', {}, { timeout: 3000 });

    fireEvent.click(screen.getByText('navigiere-/Map'));

    await screen.findByText(
      'Möchtest du hier einen neuen Angel-Spot eintragen?',
      {},
      { timeout: 3000 }
    );
  });
});
