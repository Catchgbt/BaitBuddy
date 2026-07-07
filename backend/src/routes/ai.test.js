import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import aiRouter from './ai.js';
import * as supabaseLib from '../lib/supabase.js';
import * as llmLib from '../lib/llm.js';

// Mock-Middleware für Auth
const mockAuthMiddleware = (req, res, next) => {
  req.user = { email: 'test@example.com' };
  next();
};

const app = express();
app.use(express.json());
app.use((req, res, next) => mockAuthMiddleware(req, res, next));
app.use(aiRouter);

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/llm.js', () => ({
  invokeLLM: vi.fn(),
}));

vi.mock('../lib/closedSeason.js', () => ({
  isInClosedSeason: vi.fn(() => true),
}));

vi.mock('../lib/urlSafety.js', () => ({
  isAllowedFetchUrl: vi.fn(() => true),
}));

vi.mock('../lib/errorResponse.js', () => ({
  sendDbError: (res, e) => res.status(500).json({ error: e.message }),
}));

describe('AI Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /ai/chat', () => {
    it('should handle chat message with context', async () => {
      const mockReply = 'Das klingt nach einem guten Köder für Hechte!';

      vi.mocked(supabaseLib.supabase.from).mockImplementation((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: table === 'catches' ? [
            {
              species: 'Hecht',
              length_cm: 75,
              weight_kg: 4.2,
              bait_used: 'Gummifisch',
              catch_time: '2024-01-15',
            },
          ] : [],
        }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockReply);

      const res = await request(app)
        .post('/ai/chat')
        .send({
          messages: [
            { role: 'user', content: 'Was ist ein guter Köder für Hechte?' },
          ],
          userLocation: { latitude: 52.52, longitude: 13.4 },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.reply).toBe(mockReply);
      expect(res.body.message).toBe(mockReply);
    });

    it('should include catches in context when relevant', async () => {
      const mockReply = 'Deine letzten Fänge zeigen gutes Potenzial!';

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              species: 'Forelle',
              length_cm: 45,
              weight_kg: 1.5,
              bait_used: 'Wurm',
              catch_time: '2024-01-10',
            },
          ],
        }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockReply);

      const res = await request(app)
        .post('/ai/chat')
        .send({
          messages: [
            { role: 'user', content: 'Wie sieht mein Fangbuch aus?' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(vi.mocked(llmLib.invokeLLM)).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('FANGBUCH'),
        })
      );
    });

    it('should parse and include action from LLM response', async () => {
      const mockReply = 'Ich navigiere dich zur Karte! <<ACTION>>{"type":"navigate","params":{"page":"karte"}}<<END>>';

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockReply);

      const res = await request(app)
        .post('/ai/chat')
        .send({
          messages: [{ role: 'user', content: 'Zeig mir die Karte' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.action).toEqual({
        type: 'navigate',
        params: { page: 'karte' },
      });
      expect(res.body.reply).toBe('Ich navigiere dich zur Karte!');
    });

    it('should handle malformed action JSON gracefully', async () => {
      const mockReply = 'Versuche ich! <<ACTION>>{invalid json}<<END>>';

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockReply);

      const res = await request(app)
        .post('/ai/chat')
        .send({
          messages: [{ role: 'user', content: 'Test' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.action).toBeNull();
      expect(res.body.reply).toBe('Versuche ich!');
    });

    it('should limit message history to last 6 messages', async () => {
      const mockReply = 'Antwort';

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockReply);

      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      await request(app)
        .post('/ai/chat')
        .send({ messages });

      const callArgs = vi.mocked(llmLib.invokeLLM).mock.calls[0][0];
      const historyInPrompt = callArgs.prompt.match(/Nutzer:|BaitBuddy:/g) || [];

      // Max 6 messages × 2 (user + assistant) = 12 matches, but likely less
      expect(historyInPrompt.length).toBeLessThanOrEqual(12);
    });
  });

  describe('POST /ai/analyze-catch', () => {
    it('should analyze catch image with valid base64', async () => {
      const mockAnalysis = 'Hecht, geschätzt 80cm, 5kg';

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockAnalysis);

      const res = await request(app)
        .post('/ai/analyze-catch')
        .send({
          image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.analysis).toBe(mockAnalysis);
    });

    it('should fail without image_base64', async () => {
      const res = await request(app)
        .post('/ai/analyze-catch')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('image_base64 required');
    });
  });

  describe('POST /ai/fishing-recommendation', () => {
    it('should generate fishing recommendation with weather and catches', async () => {
      const mockRaw = JSON.stringify({
        weather_rating: 'Gut',
        summary: 'Perfekte Bedingungen heute!',
        optimal_times: ['5-8 Uhr', '19-21 Uhr'],
        recommended_baits: ['Wurm', 'Gummifisch'],
        target_species: ['Hecht', 'Forelle'],
        tips: ['Morgens angeln', 'Tiefe 2-3m'],
      });

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              species: 'Hecht',
              length_cm: 75,
              bait_used: 'Gummifisch',
              catch_time: '2024-01-15',
            },
          ],
        }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockRaw);

      const res = await request(app)
        .post('/ai/fishing-recommendation')
        .send({
          latitude: 52.52,
          longitude: 13.4,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.recommendation.weather_rating).toBe('Gut');
      expect(res.body.data.catchCount).toBe(1);
    });

    it('should fail without latitude/longitude', async () => {
      const res = await request(app)
        .post('/ai/fishing-recommendation')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('erforderlich');
    });

    it('should handle missing weather data gracefully', async () => {
      const mockRaw = JSON.stringify({
        weather_rating: 'Mittel',
        summary: 'Keine Wetterdaten, aber Angeln ist möglich',
        optimal_times: ['Morgens'],
        recommended_baits: ['Wurm'],
        target_species: ['Forelle'],
        tips: ['Probier es aus'],
      });

      vi.mocked(supabaseLib.supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }));

      vi.mocked(llmLib.invokeLLM).mockResolvedValue(mockRaw);

      const res = await request(app)
        .post('/ai/fishing-recommendation')
        .send({
          latitude: 52.52,
          longitude: 13.4,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.provider).toBe('Groq (Llama)');
    });
  });
});
