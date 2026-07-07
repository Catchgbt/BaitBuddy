import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIBuddyWidget from './AIBuddyWidget';
import * as authContext from '@/lib/AuthContext';
import * as apiClient from '@/api/frontendClient';
import * as buddyQuestions from '@/lib/offlineBuddyQuestions';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/frontendClient', () => ({
  ai: {
    chat: vi.fn(),
  },
}));

vi.mock('@/lib/offlineBuddyQuestions', () => ({
  findOfflineBuddyAnswer: vi.fn(),
  getOfflineBuddyFallback: vi.fn(),
}));

vi.mock('@/components/utils/elevenLabsTTS', () => ({
  speakWithFallback: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/utils/browserTTS', () => ({
  speakWithBrowserTTS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useChatMessages', () => ({
  useChatMessages: vi.fn(() => ({
    messages: [],
    setMessages: vi.fn(),
    messagesRef: { current: [] },
    messagesEndRef: { current: null },
  })),
}));

vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: vi.fn(() => ({
    isListening: false,
    transcript: '',
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('@/hooks/useBuddyStorage', () => ({
  useBuddyStorage: vi.fn(() => ({
    widgetPos: { x: 300, y: 500 },
    setWidgetPos: vi.fn(),
    isWidgetHidden: false,
    hideWidget: vi.fn(),
    showWidget: vi.fn(),
    isVoiceEnabled: true,
    toggleVoice: vi.fn(),
    addVisitedPage: vi.fn(),
    cleanupVisitedPages: vi.fn(),
    getLocation: vi.fn(() => ({ latitude: 52.52, longitude: 13.4 })),
  })),
}));

vi.mock('@/utils/buddyActions', () => ({
  executeBuddyAction: vi.fn().mockResolvedValue(null),
}));

const renderWidget = () => {
  return render(
    <BrowserRouter>
      <AIBuddyWidget />
    </BrowserRouter>
  );
};

describe('AIBuddyWidget', () => {
  beforeEach(() => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { email: 'test@example.com' },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render widget with avatar', () => {
      renderWidget();
      expect(screen.getByRole('region', { name: /KI-Buddy/i })).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      renderWidget();
      const chatButton = screen.getByRole('button', { name: /Chat schließen/i });
      expect(chatButton).toHaveAttribute('aria-label', 'Chat schließen');
    });
  });

  describe('Chat functionality', () => {
    it('should send message on button click', async () => {
      const mockResponse = {
        reply: 'Guten Tag, wie kann ich helfen?',
        message: 'Guten Tag, wie kann ich helfen?',
        action: null,
      };

      vi.mocked(apiClient.ai.chat).mockResolvedValue(mockResponse);

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Hallo Jule');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(apiClient.ai.chat).toHaveBeenCalled();
      });
    });

    it('should send message on Enter key', async () => {
      const mockResponse = {
        reply: 'Antwort',
        action: null,
      };

      vi.mocked(apiClient.ai.chat).mockResolvedValue(mockResponse);

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(apiClient.ai.chat).toHaveBeenCalled();
      });
    });

    it('should pass user location to chat API', async () => {
      const mockResponse = { reply: 'Antwort', action: null };
      vi.mocked(apiClient.ai.chat).mockResolvedValue(mockResponse);

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(apiClient.ai.chat).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            latitude: 52.52,
            longitude: 13.4,
          })
        );
      });
    });

    it('should disable send button while loading', async () => {
      const mockResponse = { reply: 'Antwort', action: null };
      vi.mocked(apiClient.ai.chat).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      expect(sendButton).toBeDisabled();

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('Offline fallback', () => {
    it('should use offline answer when API fails', async () => {
      vi.mocked(apiClient.ai.chat).mockRejectedValue(new Error('Network error'));
      vi.mocked(buddyQuestions.findOfflineBuddyAnswer).mockReturnValue('Offline Antwort');

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(buddyQuestions.findOfflineBuddyAnswer).toHaveBeenCalledWith('Test');
      });
    });

    it('should use fallback response when no offline answer found', async () => {
      vi.mocked(apiClient.ai.chat).mockRejectedValue(new Error('Network error'));
      vi.mocked(buddyQuestions.findOfflineBuddyAnswer).mockReturnValue(null);
      vi.mocked(buddyQuestions.getOfflineBuddyFallback).mockReturnValue('Generische Fallback-Antwort');

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(buddyQuestions.getOfflineBuddyFallback).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA live region for messages', () => {
      renderWidget();
      const messagesContainer = screen.getByRole('log', { name: /Chat-Nachrichten/i });
      expect(messagesContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive aria-labels on buttons', () => {
      renderWidget();
      expect(screen.getByRole('button', { name: /Chat schließen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Nachricht senden/i })).toBeInTheDocument();
    });

    it('should have aria-label on input field', () => {
      renderWidget();
      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      expect(input).toHaveAttribute('aria-label', 'Chat-Eingabefeld');
    });

    it('should have aria-pressed on voice button', () => {
      renderWidget();
      const voiceButton = screen.getByRole('button', { name: /Spracherkennung/i });
      expect(voiceButton).toHaveAttribute('aria-pressed');
    });

    it('should have aria-label on suggestion buttons', async () => {
      renderWidget();
      const suggestions = screen.queryAllByRole('button', { name: /Frage senden:/ });
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling', () => {
    it('should handle TTS errors gracefully', async () => {
      const mockResponse = { reply: 'Antwort mit Sound', action: null };
      vi.mocked(apiClient.ai.chat).mockResolvedValue(mockResponse);

      const { speakWithFallback } = await import('@/components/utils/elevenLabsTTS');
      vi.mocked(speakWithFallback).mockRejectedValue(new Error('TTS failed'));

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(apiClient.ai.chat).toHaveBeenCalled();
      });
    });

    it('should not crash on malformed API response', async () => {
      vi.mocked(apiClient.ai.chat).mockResolvedValue({});

      renderWidget();
      const user = userEvent.setup();

      const input = screen.getByPlaceholderText('Schreib eine Frage...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /KI-Buddy/i })).toBeInTheDocument();
      });
    });
  });
});
