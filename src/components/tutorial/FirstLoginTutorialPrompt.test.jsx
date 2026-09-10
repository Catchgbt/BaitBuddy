import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/components/i18n/LanguageContext', () => ({
  useLanguage: () => ({ language: 'de', t: (k) => k }),
}));

// Das echte Modal zieht TTS und Router mit; hier zählt nur, ob es geöffnet wird.
vi.mock('./TutorialModal', () => ({
  default: ({ isOpen, onComplete }) =>
    isOpen ? (
      <div data-testid="tutorial-modal">
        <button type="button" onClick={onComplete}>fertig</button>
      </div>
    ) : null,
}));

import FirstLoginTutorialPrompt from './FirstLoginTutorialPrompt';
import { isTutorialCompleted, markTutorialPrompted, wasTutorialPrompted } from '@/lib/tutorialState';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** Überspringt die Anzeige-Verzögerung. */
async function passDelay() {
  await act(async () => { vi.advanceTimersByTime(3000); });
}

describe('FirstLoginTutorialPrompt', () => {
  it('bietet neuen Nutzern die Tour an — aber erst nach kurzer Verzögerung', async () => {
    render(<FirstLoginTutorialPrompt />);

    // Nicht sofort: sonst konkurriert der Hinweis mit Splash und Buddy-Begrüßung.
    expect(screen.queryByText('Neu dabei?')).not.toBeInTheDocument();

    await passDelay();
    expect(screen.getByText('Neu dabei?')).toBeInTheDocument();
  });

  it('öffnet das Tutorial über „Tour starten"', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FirstLoginTutorialPrompt />);
    await passDelay();

    await user.click(screen.getByRole('button', { name: 'Tour starten' }));

    // findBy*, weil TutorialModal lazy geladen wird (Suspense loest den
    // dynamischen Import erst im naechsten Microtask auf).
    expect(await screen.findByTestId('tutorial-modal')).toBeInTheDocument();
    expect(wasTutorialPrompted()).toBe(true);
  });

  it('fragt nach „Später" nie wieder', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<FirstLoginTutorialPrompt />);
    await passDelay();

    await user.click(screen.getByRole('button', { name: 'Später' }));

    // Auf das Verschwinden im DOM wird bewusst nicht geprüft: AnimatePresence
    // hält den Knoten während der Exit-Animation noch vor, und unter Fake-Timern
    // läuft die nie zu Ende. Die belastbare Zusage ist der gemerkte Zustand …
    expect(wasTutorialPrompted()).toBe(true);

    // … und dass eine frisch geladene App nicht erneut fragt.
    unmount();
    cleanup();
    render(<FirstLoginTutorialPrompt />);
    await passDelay();
    expect(screen.queryByText('Neu dabei?')).not.toBeInTheDocument();
  });

  it('erscheint gar nicht, wenn schon einmal gefragt wurde', async () => {
    markTutorialPrompted();
    render(<FirstLoginTutorialPrompt />);
    await passDelay();
    expect(screen.queryByText('Neu dabei?')).not.toBeInTheDocument();
  });

  it('merkt den Abschluss, wenn die Tour durchlaufen wird', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FirstLoginTutorialPrompt />);
    await passDelay();

    await user.click(screen.getByRole('button', { name: 'Tour starten' }));
    await user.click(await screen.findByRole('button', { name: 'fertig' }));

    expect(isTutorialCompleted()).toBe(true);
  });
});
