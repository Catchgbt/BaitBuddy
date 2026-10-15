import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FishingRecommendationCard from './FishingRecommendationCard';

const mocks = vi.hoisted(() => ({ ensureLocation: vi.fn(), recommend: vi.fn() }));
vi.mock('@/components/location/LocationManager', () => ({
  useLocation: () => ({ ensureLocation: mocks.ensureLocation }),
}));
vi.mock('@/functions/getFishingRecommendation', () => ({
  getFishingRecommendation: (...args) => mocks.recommend(...args),
}));
vi.mock('@/components/ai/SpeakButton', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('KI-Angelempfehlung im Dashboard', () => {
  it('liefert bei verweigertem GPS eine Fangbuch-Empfehlung mit sichtbarem Hinweis', async () => {
    mocks.ensureLocation.mockResolvedValue(null);
    mocks.recommend.mockResolvedValue({ data: {
      weather: null, catchCount: 1,
      recommendation: { weather_rating: 'Unbekannt', summary: 'Deine Fänge sprechen für Gummifisch.' },
    } });

    render(<FishingRecommendationCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Analysieren' }));

    expect(await screen.findByText('Deine Fänge sprechen für Gummifisch.')).toBeInTheDocument();
    expect(mocks.recommend).toHaveBeenCalledWith({});
    expect(screen.getByRole('status')).toHaveTextContent('Ohne Live-Wetter');
  });

  it('zeigt einen leeren Fangbuch-Fehler direkt im Dashboard', async () => {
    mocks.ensureLocation.mockResolvedValue(null);
    mocks.recommend.mockRejectedValue({ status: 422, data: { error: 'Standort oder Fang nötig.' } });

    render(<FishingRecommendationCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Analysieren' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Standort oder Fang nötig.');
    expect(screen.getByRole('button', { name: 'Analysieren' })).toBeEnabled();
  });
});
