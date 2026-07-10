import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// PremiumGuard und schwere Abhängigkeiten wegmocken, damit der Test die
// Chat-/History-Logik isoliert prüft.
vi.mock('@/components/premium/PremiumGuard', () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock('@/components/ai/JuleAvatar', () => ({ default: () => <div data-testid="jule" /> }));
vi.mock('@/hooks/useFeatureTracking', () => ({ useFeatureTracking: () => {} }));
vi.mock('@/hooks/useEventActivityTracking', () => ({
  useEventActivityTracking: () => ({ trackAIChat: vi.fn() }),
}));
vi.mock('@/hooks/useElevenLabsVoice', () => ({
  useElevenLabsVoice: () => ({ speak: vi.fn(async () => true), stop: vi.fn(), isSpeaking: false }),
}));
vi.mock('@/api/frontendClient', () => ({
  events: { getActiveEvent: vi.fn(async () => ({})) },
}));
vi.mock('@/lib/offlineBuddyQuestions', () => ({
  findOfflineBuddyAnswer: vi.fn(() => null),
  getOfflineBuddyFallback: vi.fn(() => 'OFFLINE'),
}));
vi.mock('@/functions/catchgbtChat', () => ({ catchgbtChat: vi.fn() }));

import KiBuddyBeta from './KiBuddyBeta';
import { catchgbtChat } from '@/functions/catchgbtChat';

async function ask(text) {
  const input = await screen.findByPlaceholderText('Frage stellen...');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('KiBuddyBeta – Chat-Historie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => cleanup());

  it('sendet beim zweiten Turn die vollständige Historie ohne Duplikat (Stale-Closure-Fix)', async () => {
    catchgbtChat
      .mockResolvedValueOnce({ reply: 'erste Antwort' })
      .mockResolvedValueOnce({ reply: 'zweite Antwort' });

    render(<KiBuddyBeta />);

    await ask('erste Frage');
    expect(await screen.findByText('erste Antwort')).toBeInTheDocument();

    await ask('zweite Frage');
    expect(await screen.findByText('zweite Antwort')).toBeInTheDocument();

    // Der zweite LLM-Aufruf muss die komplette Historie enthalten: den ersten
    // User-Turn, die erste Antwort und den neuen User-Turn – jeweils genau einmal.
    const secondCall = catchgbtChat.mock.calls[1][0];
    expect(secondCall.messages).toEqual([
      { role: 'user', content: 'erste Frage' },
      { role: 'assistant', content: 'erste Antwort' },
      { role: 'user', content: 'zweite Frage' },
    ]);
  });
});
