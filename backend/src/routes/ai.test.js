import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const { supabaseMock, llmMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
  llmMock: { invokeLLM: null },
}));

vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));
vi.mock('../lib/llm.js', () => ({
  invokeLLM: (...args) => llmMock.invokeLLM(...args),
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({ authUser: { id: 'u1', email: 'a@b.de' } });
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/ai/chat', () => {
  it('lehnt Zugriff ohne Token ab (401)', async () => {
    llmMock.invokeLLM = vi.fn();
    const res = await request(app).post('/api/ai/chat').send({ messages: [] });
    expect(res.status).toBe(401);
    expect(llmMock.invokeLLM).not.toHaveBeenCalled();
  });

  it('liefert eine Antwort und trennt den ACTION-Block ab', async () => {
    llmMock.invokeLLM = vi.fn().mockResolvedValue(
      'Klar, ich öffne die Karte für dich!<<ACTION>>{"type":"navigate","params":{"page":"karte"}}<<END>>'
    );
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Zeig mir die Karte' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Klar, ich öffne die Karte für dich!');
    expect(res.body.reply).not.toContain('<<ACTION>>');
    expect(res.body.action).toEqual({ type: 'navigate', params: { page: 'karte' } });
  });

  it('gibt action=null zurück, wenn kein Aktions-Block vorhanden ist', async () => {
    llmMock.invokeLLM = vi.fn().mockResolvedValue('Petri Heil, wie war dein letzter Ansitz?');
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Hallo' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Petri Heil, wie war dein letzter Ansitz?');
    expect(res.body.action).toBeNull();
  });

  it('meldet einen KI-Fehler als 500', async () => {
    llmMock.invokeLLM = vi.fn().mockRejectedValue(new Error('Groq API Fehler 503'));
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Hallo' }] });

    expect(res.status).toBe(500);
  });
});
