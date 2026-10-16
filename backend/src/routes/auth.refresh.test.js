import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../lib/supabase.js', () => ({
  supabase: {},
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-service-role-key',
}));

import authRouter from './auth.js';

const app = express();
app.use(express.json());
app.use('/api', authRouter);

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/auth/refresh', () => {
  it('gibt die rotierte Sitzung zurück', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-access', refresh_token: 'new-refresh',
    }))));
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'old-refresh' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: 'new-access', refresh_token: 'new-refresh' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ refresh_token: 'old-refresh' });
  });

  it.each([400, 401, 403])('meldet eine tatsächliche Ablehnung (%i) als abgelaufene Sitzung', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'invalid' });
    expect(res.status).toBe(401);
  });

  it.each([408, 429, 500, 502, 503, 504])('beendet die Sitzung bei GoTrue-Fehler %i nicht', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"internal upstream details"}', { status })));
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'valid' });
    expect(res.status).toBe(status === 429 ? 429 : 503);
    expect(res.body.error).toMatch(/vorübergehend/);
    expect(res.text).not.toContain('internal upstream details');
  });

  it('wertet eine fehlerhafte Erfolgsantwort nicht als Token-Ablehnung', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Gateway</html>')));
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'valid' });
    expect(res.status).toBe(503);
  });

  it('behandelt einen Netzwerkausfall als vorübergehenden Fehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'valid' });
    expect(res.status).toBe(503);
  });

  it('lehnt fehlende Refresh-Tokens ohne Upstream-Aufruf ab', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
