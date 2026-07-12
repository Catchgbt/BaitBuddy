import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('entfernt nackte Action-JSON ohne Marker aus der sichtbaren Antwort', async () => {
    llmMock.invokeLLM = vi.fn().mockResolvedValue(
      'Ich bringe uns mal in die Karte und schaue, welche Optionen es gibt. {"type":"navigate","params":{"page":"karte"}}'
    );
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Zeig mir Angelshops' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Ich bringe uns mal in die Karte und schaue, welche Optionen es gibt.');
    expect(res.body.reply).not.toContain('{"type"');
    expect(res.body.reply).not.toContain('navigate');
    expect(res.body.action).toEqual({ type: 'navigate', params: { page: 'karte' } });
  });

  it('entfernt nackte Action-JSON mit verschachtelten params', async () => {
    llmMock.invokeLLM = vi.fn().mockResolvedValue(
      'Trage ich ein. {"type":"log_catch","params":{"species":"Hecht","notes":"schön {dick}"}}'
    );
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Hecht 80cm' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Trage ich ein.');
    expect(res.body.reply).not.toContain('{"type"');
    expect(res.body.action).toEqual({
      type: 'log_catch',
      params: { species: 'Hecht', notes: 'schön {dick}' },
    });
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

  it('lehnt messages ab, die kein Array sind (400 statt 500)', async () => {
    llmMock.invokeLLM = vi.fn();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: 'kein array' });

    expect(res.status).toBe(400);
    expect(llmMock.invokeLLM).not.toHaveBeenCalled();
  });

  it('baut Praxis-Wissensbasis und Anleitungs-Regeln in den System-Prompt ein', async () => {
    let prompt = '';
    llmMock.invokeLLM = vi.fn(async (args) => { prompt = args.prompt; return 'ok'; });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: 'Wie benutze ich den Gummifisch im Wasser?' }] });

    expect(res.status).toBe(200);
    // Anleitungs-Regeln: nie auf Tutorials abschieben, selbst erklären.
    expect(prompt).toContain('ANLEITUNGS-REGELN');
    expect(prompt).toContain('ERKLÄRST DU ES IMMER SELBST');
    // Wissensbasis: konkrete Praxis-Themen müssen im Prompt stehen.
    expect(prompt).toContain('GUMMIFISCH');
    expect(prompt).toContain('UNTERWASSER-KÖDERBOX');
    expect(prompt).toContain('KNOTEN');
    // Gesprächsstil (variierende Rückfragen) und App-Funktionswissen.
    expect(prompt).toContain('GESPRÄCHSSTIL & RÜCKFRAGEN');
    expect(prompt).toContain('DEINE APP-FUNKTIONEN');
    expect(prompt).toContain('Fangbuch');
  });

  it('kappt überlange Nachrichten-Contents vor dem Prompt-Aufbau', async () => {
    let prompt = '';
    llmMock.invokeLLM = vi.fn(async (args) => { prompt = args.prompt; return 'ok'; });
    const huge = 'a'.repeat(9000);

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer tok')
      .send({ messages: [{ role: 'user', content: huge }] });

    expect(res.status).toBe(200);
    // Content wird auf 4000 Zeichen gekappt: 4000 'a' am Stück kommen vor,
    // 4001 nicht mehr.
    expect(prompt).toContain('a'.repeat(4000));
    expect(prompt).not.toContain('a'.repeat(4001));
  });
});

describe('POST /api/ai/analyze-catch (SSRF-Schutz)', () => {
  it('lehnt eine fremde Bild-URL ab, ohne die KI aufzurufen (400)', async () => {
    llmMock.invokeLLM = vi.fn();
    const res = await request(app)
      .post('/api/ai/analyze-catch')
      .set('Authorization', 'Bearer tok')
      .send({ file_url: 'https://evil.example.com/internal.jpg' });

    expect(res.status).toBe(400);
    expect(llmMock.invokeLLM).not.toHaveBeenCalled();
  });

  it('akzeptiert direktes Base64 und ruft die KI auf', async () => {
    llmMock.invokeLLM = vi.fn().mockResolvedValue('Ein Hecht, ca. 70cm.');
    const res = await request(app)
      .post('/api/ai/analyze-catch')
      .set('Authorization', 'Bearer tok')
      .send({ image_base64: 'QUJD' });

    expect(res.status).toBe(200);
    expect(res.body.analysis).toBe('Ein Hecht, ca. 70cm.');
  });
});

describe('POST /api/ai/tts', () => {
  const origKey = process.env.ELEVENLABS_API_KEY;

  afterEach(() => {
    if (origKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = origKey;
    vi.unstubAllGlobals();
  });

  it('gibt 400 zurück, wenn kein Text übergeben wird', async () => {
    const res = await request(app)
      .post('/api/ai/tts')
      .set('Authorization', 'Bearer tok')
      .send({ text: '' });
    expect(res.status).toBe(400);
  });

  it('gibt 501 zurück, wenn kein ElevenLabs-Key konfiguriert ist', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const res = await request(app)
      .post('/api/ai/tts')
      .set('Authorization', 'Bearer tok')
      .send({ text: 'Hallo' });
    expect(res.status).toBe(501);
  });

  it('gibt 502 zurück, wenn der ElevenLabs-Upstream fehlschlägt', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'upstream boom',
    })));

    const res = await request(app)
      .post('/api/ai/tts')
      .set('Authorization', 'Bearer tok')
      .send({ text: 'Hallo' });
    expect(res.status).toBe(502);
  });

  it('faellt bei 402 (Library-Voice im Free-Plan) auf die Premade-Voice zurueck', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
    const origVoice = process.env.ELEVENLABS_VOICE_ID;
    process.env.ELEVENLABS_VOICE_ID = 'library-voice-xyz';
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 402,
          text: async () => '{"detail":{"code":"paid_plan_required"}}',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          arrayBuffer: async () => new TextEncoder().encode('MP3DATA').buffer,
        });
      vi.stubGlobal('fetch', fetchMock);

      const res = await request(app)
        .post('/api/ai/tts')
        .set('Authorization', 'Bearer tok')
        .send({ text: 'Hallo' });

      expect(res.status).toBe(200);
      expect(res.body.audioBase64).toBe(Buffer.from('MP3DATA').toString('base64'));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(String(fetchMock.mock.calls[0][0])).toContain('library-voice-xyz');
      expect(String(fetchMock.mock.calls[1][0])).toContain('onwK4e9ZLuTAKqWW03F9');
    } finally {
      if (origVoice === undefined) delete process.env.ELEVENLABS_VOICE_ID;
      else process.env.ELEVENLABS_VOICE_ID = origVoice;
    }
  });
});

describe('POST /api/ai/realtime-session', () => {
  const origKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (origKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = origKey;
    vi.unstubAllGlobals();
  });

  it('gibt 503 zurück, wenn kein OpenAI-Key konfiguriert ist', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await request(app)
      .post('/api/ai/realtime-session')
      .set('Authorization', 'Bearer tok')
      .send({});
    expect(res.status).toBe(503);
  });

  it('gibt 502 zurück, wenn der OpenAI-Upstream fehlschlägt', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: { message: 'OpenAI down' } }),
    })));

    const res = await request(app)
      .post('/api/ai/realtime-session')
      .set('Authorization', 'Bearer tok')
      .send({});
    expect(res.status).toBe(502);
  });

  it('mintet ein Ephemeral-Token ueber den GA-Endpunkt /v1/realtime/client_secrets', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ value: 'ek_test_123', expires_at: 1234567890, session: {} }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app)
      .post('/api/ai/realtime-session')
      .set('Authorization', 'Bearer tok')
      .send({});

    expect(res.status).toBe(200);
    // Client-Vertrag bleibt stabil: client_secret.value traegt das Token.
    expect(res.body.client_secret.value).toBe('ek_test_123');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.openai.com/v1/realtime/client_secrets');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.session.type).toBe('realtime');
    expect(sentBody.session.model).toBeTruthy();
  });

  it('gibt der Voice-Session Anleitungs-Regeln und Praxis-Wissensbasis mit', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ value: 'ek_test_123', expires_at: 1234567890, session: {} }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app)
      .post('/api/ai/realtime-session')
      .set('Authorization', 'Bearer tok')
      .send({});

    expect(res.status).toBe(200);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const instructions = sentBody.session.instructions;
    expect(instructions).toContain('ANLEITUNGS-REGELN');
    expect(instructions).toContain('niemals nur auf Tutorials');
    expect(instructions).toContain('GUMMIFISCH');
    expect(instructions).toContain('UNTERWASSER-KÖDERBOX');
    // Gesprächsstil und App-Funktionswissen — plus die Klarstellung, dass der
    // Voice-Buddy selbst keine App-Aktionen ausführen kann.
    expect(instructions).toContain('GESPRÄCHSSTIL & RÜCKFRAGEN');
    expect(instructions).toContain('DEINE APP-FUNKTIONEN');
    expect(instructions).toContain('KEINE App-Aktionen');
  });
});
