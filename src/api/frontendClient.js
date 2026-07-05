// src/api/frontendClient.js
// Eigener BaitBuddy API-Client — ersetzt @base44/sdk vollständig

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'bb_token';
const REFRESH_KEY = 'bb_refresh';

// ── Raw HTTP Client ───────────────────────────────────────────────────────────
class ApiClient {
  constructor() {
    // Token wird bei jeder Request aus localStorage gelesen, nicht gecacht
    this._refreshPromise = null;
  }

  setToken(token) {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  setRefreshToken(token) {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    }
  }

  getRefreshToken() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(REFRESH_KEY);
    }
    return null;
  }

  // Supabase-Access-Tokens laufen nach ~1h ab. Bei 401 wird hier einmalig ein
  // frisches Token geholt und die Anfrage wiederholt, statt den Nutzer mit
  // "Verbindungsfehler" sitzen zu lassen. Parallele 401s teilen sich denselben
  // Refresh-Call (Supabase rotiert Refresh-Tokens bei jeder Nutzung).
  _refreshSession() {
    if (!this._refreshPromise) {
      this._refreshPromise = (async () => {
        try {
          const res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: this.getRefreshToken() }),
            signal: AbortSignal.timeout(15000), // 15s timeout for token refresh
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.token) {
            this.setToken(null);
            this.setRefreshToken(null);
            return false;
          }
          this.setToken(data.token);
          if (data.refresh_token) this.setRefreshToken(data.refresh_token);
          return true;
        } catch {
          return false;
        }
      })().finally(() => { this._refreshPromise = null; });
    }
    return this._refreshPromise;
  }

  async request(method, path, body, _retried = false) {
    const token = this.getToken();
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Abgelaufene Sitzung: einmalig Token erneuern und Anfrage wiederholen.
      // Login/Register/Refresh selbst sind ausgenommen (401 = falsche Daten).
      const noRetry = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
      if (res.status === 401 && !_retried && !noRetry.some(p => path.startsWith(p)) && this.getRefreshToken()) {
        const refreshed = await this._refreshSession();
        if (refreshed) return this.request(method, path, body, true);
      }
      const err = /** @type {Error & { status?: number, data?: any }} */ (
        new Error(data.error || `HTTP ${res.status}`)
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  get(path)         { return this.request('GET', path); }
  post(path, body)  { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  del(path)         { return this.request('DELETE', path); }
}

export const api = new ApiClient();

// ── Entity REST Endpoint Mapping ───────────────────────────────────────────
const ENTITY_MAP = {
  Catch:          '/api/catches',
  Spot:           '/api/spots',
  Post:           '/api/community/posts',
  Comment:        '/api/community/comments',
  Competition:    '/api/events',
  AppEvent:       '/api/events',
  UsageSession:   '/api/user/sessions',
  SupportTicket:  '/api/support/tickets',
  GearListing:    '/api/gear/listings',
  FishingClub:    '/api/fishing/clubs',
  FishingPlan:    '/api/fishing/plans',
  PremiumWallet:  '/api/premium/wallet',
  FunctionRating: '/api/ratings',
  ChatSession:    '/api/community/sessions',
  RuleEntry:      '/api/fishing/rules',
  ExamQuestion:   '/api/exams',
  User:           '/api/admin/users',
  ChatMessage:    '/api/ai/messages',
  LiveTrip:       '/api/trips',
  GearCategory:   '/api/gear/categories',
  GearItem:       '/api/gear/items',
  GearRule:       '/api/gear/rules',
  Loadout:        '/api/gear/loadouts',
  PackSession:    '/api/gear/sessions',
  BaitRecipe:     '/api/bait-recipes',
  Clan:           '/api/community/clans',
  WaterReview:    '/api/water-reviews',
  WaterAnalysisHistory: '/api/water-analysis-history',
  VotingLike:     '/api/voting-likes',
  BathymetricMap: '/api/bathymetric-maps',
  DepthDataPoint: '/api/depth-data-points',
  License:        '/api/licenses',
  SocialMediaShare: '/api/social-media/shares',
};

function makeEntity(entityName) {
  const base = ENTITY_MAP[entityName];

  // Generate unique offline ID (for retry-ability and deduplication)
  const generateOfflineId = () => {
    const uid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `offline_${uid}`;
  };

  const safeGet = async (path) => {
    try { return await api.get(path); } catch (error) {
      // Return error indicator instead of silent [] — caller can differentiate
      return { __error: true, message: error.message || 'Fehler beim Laden' };
    }
  };
  const safePost = async (path, body) => {
    try { return await api.post(path, body); } catch (error) {
      // Return error indicator instead of fake offline object
      return { __error: true, message: error.message || 'Fehler beim Speichern' };
    }
  };

  return {
    list: async (orderBy, limit) => {
      if (!base) return [];
      const p = new URLSearchParams();
      if (limit) p.set('limit', limit);
      if (orderBy) p.set('order', orderBy);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const result = await safeGet(`${base}${qs}`);
      if (result?.__error) return [];
      return Array.isArray(result) ? result : [];
    },

    filter: async (filters = {}) => {
      if (!base) return [];
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null) p.set(k, String(v)); });
      const qs = p.toString() ? `?${p.toString()}` : '';
      const result = await safeGet(`${base}${qs}`);
      if (result?.__error) return [];
      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.data)) return result.data;
      return [];
    },

    get: async (id) => {
      if (!base) return null;
      try { return await api.get(`${base}/${id}`); } catch { return null; }
    },

    create: async (data) => {
      if (!base) return { id: generateOfflineId(), ...data };
      const result = await safePost(base, data);
      if (result?.__error) throw new Error(result.message);
      return result;
    },

    bulkCreate: async (items = []) => {
      if (!base) return items.map((d) => ({ id: generateOfflineId(), ...d }));
      const result = await api.post(`${base}/bulk`, items);
      return Array.isArray(result) ? result : [];
    },

    update: async (id, data) => {
      if (!base) return { id, ...data };
      return await api.patch(`${base}/${id}`, data);
    },

    delete: async (id) => {
      if (!base) return { ok: true };
      return await api.del(`${base}/${id}`);
    },

    // Realtime-Subscriptions gibt es backend-seitig (noch) nicht. Sicherer
    // No-op-Stub: ruft den Callback nie auf und liefert eine No-op-unsubscribe
    // zurück. Verhindert TypeError (vormals base44-SDK-Funktion); Initialdaten
    // kommen weiterhin über list/filter.
    subscribe: () => () => {},
  };
}

// Proxy erzeugt Entities on demand
const entitiesProxy = new Proxy({}, {
  get(_, entityName) { return makeEntity(entityName); }
});

// Nativer Entity-Zugriff (Teil der base44-Ablösung): erlaubt
// `import { entities } from '@/api/frontendClient'` ohne base44-Wrapper.
// Der Proxy erzeugt Entities dynamisch nach Namen — daher Record-Typisierung.
/** @type {Record<string, ReturnType<typeof makeEntity>>} */
export const entities = entitiesProxy;

// ── Function Endpoint Mapping ───────────────────────────────────────────────
const FUNCTION_MAP = {
  catchgbtChat:           (d) => api.post('/api/ai/chat', d),
  realtimeSession:        (d) => api.post('/api/ai/realtime-session', d || {}),
  getPlanStatus:          ()  => api.get('/api/premium/status'),
  textToSpeech:           (d) => api.post('/api/ai/tts', d),
  backendTextToSpeech:    (d) => api.post('/api/ai/tts', d),
  geminiTextToSpeech:     (d) => api.post('/api/ai/tts', d),
  freeNeuralTTS:          (d) => api.post('/api/ai/tts', d),
  // Foto-Analyse für strukturierte Fang-Daten. Nutzt /analyze-photo (liefert
  // species/length_cm/weight_kg), NICHT /ai/analyze-catch (liefert nur Freitext).
  // Die Antwort wird ins von den Aufrufern (CatchDetailModal, PendingPhotoCard,
  // QuickCatchDialog) erwartete Format { data: { result_data, summary } } gemappt —
  // ohne dieses Mapping waren deren `result_data`-Prüfungen immer falsch und die
  // KI-Foto-Analyse zeigte nie ein Ergebnis.
  analyzeCatchPhoto: async (d) => {
    const r = await api
      .post('/api/analyze-photo', { image: d?.file_url || d?.image_base64 || d?.image })
      .catch(() => null);
    if (!r?.ok || (!r.species && r.length_cm == null && r.weight_kg == null)) {
      return { data: null };
    }
    return {
      data: {
        result_data: {
          species_name: r.species || '',
          length_cm: r.length_cm ?? null,
          weight_kg: r.weight_kg ?? null,
          bait_used: r.bait_used ?? null,
          confidence: r.confidence ?? null,
        },
        summary: r.species
          ? `Erkannt: ${r.species}${r.length_cm ? `, ca. ${Math.round(r.length_cm)} cm` : ''}`
          : 'Keine Fischart erkannt',
      },
    };
  },
  aiEvaluateCatch:        (d) => api.post('/api/ai/evaluate-catch', d),
  generateCatchReport:    (d) => api.post('/api/ai/generate-catch-report', d),
  fishBehaviorAnalysis:   (d) => api.post('/api/ai/fish-behavior-analysis', d),
  calculateTravelTime:    (d) => api.post('/api/fishing/clubs/nearby', d).catch(() => ({})),
  angelspotsGeojson:      ()  => api.get('/api/fishing/hotspots').catch(() => ({})),
  'angelspots-geojson':   ()  => api.get('/api/fishing/hotspots').catch(() => ({})),
  detectHotspots:         (d) => api.post('/api/fishing/hotspots/detect', d).catch(() => ({ hotspots: [] })),
  createStripeCheckoutSession: (d) => api.post('/api/premium/checkout', d),
  activateDemoMode:       ()  => api.post('/api/premium/activate-demo'),
  activatePlan:           (d) => api.post('/api/premium/activate', d),
  adminAssignPlan:        (d) => api.post('/api/admin/plans/assign', d).catch(() => ({ ok: true })),
  adminResetWallet:       (d) => api.post('/api/admin/wallet/reset', d).catch(() => ({ ok: true })),
  adminSetCredits:        (d) => api.post('/api/admin/credits/set', d).catch(() => ({ ok: true })),
  deleteAccount:          ()  => api.del('/api/user/account'),
  createClan:             (d) => api.post('/api/community/clans', d),
  joinClan:               (d) => api.post(`/api/community/clans/${d?.clan_id}/join`),
  getClanLeaderboard:     (d) => api.get(`/api/community/clans/leaderboard?competition_id=${d?.competition_id || ''}`).catch(() => ({ leaderboard: [] })),
  checkFeatureAccess:     (d) => api.post('/api/premium/check-feature', d).catch(() => ({ allowed: false })),
  geocodeFishingClubs:    (d) => api.post('/api/fishing/clubs/geocode', d).catch(() => []),
  addVotingLike:          (d) => api.post(`/api/community/voting/${d?.submission_id}/like`).catch(() => ({ ok: true })),
  getVotingLeaderboard:   ()  => api.get('/api/community/voting/leaderboard').then(r => ({ leaderboard: Array.isArray(r) ? r : (r?.leaderboard || []) })).catch(() => ({ leaderboard: [] })),
  catchgbtVoices:         ()  => api.get('/api/ai/voices').catch(() => ({ voices: [] })),
  catchgbtPing:           ()  => api.get('/api/health').catch(() => ({ ok: false })),
  generateBathymetricMap: (d) => api.post('/api/water/bathymetric-map', d).catch(() => null),
  bathymetryProxy:        (d) => api.post('/api/water/bathymetry', d).catch(() => null),
  cleanupOldSessions:     ()  => Promise.resolve({ ok: true }),
  autoRenewPlans:         ()  => Promise.resolve({ ok: true }),
  verifyPlayIntegrity:    ()  => Promise.resolve({ valid: false }),
  recordWebVitals:        ()  => Promise.resolve({ ok: true }),
  startCommunityCompetition: (d) => api.post('/api/community/competitions/start', { template_id: d?.template_id }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  me: () => api.get('/api/auth/me'),

  updateMe: (data) => api.patch('/api/auth/me', data),

  // base44-SDK-Kompatibilität: gleicher Endpunkt wie updateMe
  updateMyUserData: (data) => api.patch('/api/auth/me', data),

  isAuthenticated: async () => {
    if (!api.getToken()) return false;
    try { await api.get('/api/auth/me'); return true; }
    catch { return false; }
  },

  getToken: () => api.getToken(),

  setToken: (token) => api.setToken(token),

  setRefreshToken: (token) => api.setRefreshToken(token),

  logout: (redirectUrl) => {
    api.setToken(null);
    api.setRefreshToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl || '/';
    }
  },

  redirectToLogin: (redirectUrl) => {
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl || '/';
    }
  },

  login: (email, password) =>
    api.post('/api/auth/login', { email, password }).then(res => {
      if (res.token) {
        api.setToken(res.token);
        if (res.refresh_token) api.setRefreshToken(res.refresh_token);
        // Trigger PlanContext to reload plan after token is set
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('plan-updated'));
        }
      }
      return res;
    }),

  register: (email, password, full_name) =>
    api.post('/api/auth/register', { email, password, full_name }).then(res => {
      if (res.token) {
        api.setToken(res.token);
        if (res.refresh_token) api.setRefreshToken(res.refresh_token);
        // Trigger PlanContext to reload plan after token is set
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('plan-updated'));
        }
      }
      return res;
    }),
};

// ── Unified User ──────────────────────────────────────────────────────────────
// Das base44-SDK bündelte am `User` sowohl Auth-Helfer (me, updateMyUserData …)
// als auch Entity-Queries (list, filter …). Wir spiegeln das hier, damit beide
// Aufrufstile funktionieren. Auth-Methoden werden zuletzt gemerged und haben so
// Vorrang vor den generischen Entity-Methoden.
export const User = Object.assign(makeEntity('User'), auth);

// ── Integrations ──────────────────────────────────────────────────────────────
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit

    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`Datei zu groß (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = /** @type {string} */ (reader.result).split(',')[1];
        if (!base64) {
          throw new Error('Fehler beim Konvertieren zu Base64');
        }
        resolve(base64);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => {
      reject(new Error('Fehler beim Lesen der Datei'));
    };
    reader.onabort = () => {
      reject(new Error('Datei-Lesevorgang abgebrochen'));
    };
    reader.readAsDataURL(file);
  });
};

// Sucht ab dem ersten "{" das dazu passende schliessende "}" (Klammertiefe,
// unter Beachtung von Strings/Escapes) statt der bisherigen Greedy-Regex
// /\{[\s\S]*\}/, die bei Prosa NACH dem JSON-Block (z.B. "...} Lass es mich
// wissen!") das komplette Antwortende mit in den JSON.parse-Versuch zog und
// so an harmlosem Anhangstext scheiterte.
function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export const integrations = {
  Core: {
    // base44-Kompatibilität: InvokeLLM liefert den Antwort-TEXT zurück — bzw. bei
    // response_json_schema das geparste JSON-Objekt — nicht das rohe
    // { ok, reply, message }-Transportobjekt. Mehrere Seiten (Weather,
    // BaitMixerPro, Help, StartFishing) setzen/rendern das Ergebnis direkt; ohne
    // diese Entpackung landete "[object Object]" im UI bzw. React warf beim
    // Rendern eines Objekts als React-Child.
    InvokeLLM: async ({ prompt, response_json_schema, ...rest }) => {
      const jsonHint = response_json_schema
        ? `\n\nAntworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt gemäß diesem Schema, ohne Markdown und ohne weitere Erklärungen:\n${JSON.stringify(response_json_schema)}`
        : '';
      const res = await api.post('/api/ai/chat', {
        messages: [{ role: 'user', content: `${prompt}${jsonHint}` }],
        ...rest,
      });
      const text = res?.reply ?? res?.message ?? '';
      if (!response_json_schema) return text;
      // Strukturierte Antwort erwartet: JSON aus dem Text extrahieren. Bei
      // Fehlschlag ein leeres Objekt liefern — Aufrufer greifen mit ?./&& zu.
      if (typeof text !== 'string') return {};
      const trimmed = text.trim();
      // 1) Ganze Antwort ist bereits JSON (Modell hat sich an den Hinweis gehalten)
      try { return JSON.parse(trimmed); } catch { /* weiter zu 2) */ }
      // 2) Markdown-Codefence entfernen (```json ... ``` oder ``` ... ```)
      const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        try { return JSON.parse(fenceMatch[1].trim()); } catch { /* weiter zu 3) */ }
      }
      // 3) JSON-Block per Klammertiefe extrahieren (toleriert Prosa davor/danach)
      const balanced = extractBalancedJson(trimmed);
      if (balanced) {
        try { return JSON.parse(balanced); } catch { /* Fallthrough zu {} */ }
      }
      console.warn('InvokeLLM: konnte kein JSON aus der Antwort extrahieren', trimmed.slice(0, 200));
      return {};
    },
    SendEmail:  () => Promise.resolve({ ok: true }),
    SendSMS:    () => Promise.resolve({ ok: true }),
    UploadFile: async ({ file }) => {
      if (!file) throw new Error('Datei erforderlich');
      if (!file.name) throw new Error('Datei hat keinen Namen');
      if (!file.type) throw new Error('Datei-Typ konnte nicht ermittelt werden');

      try {
        const file_base64 = await fileToBase64(file);
        const response = await api.post('/api/files/upload', {
          file_base64,
          file_name: file.name,
          file_type: file.type,
        });

        if (!response || !response.file_url) {
          throw new Error('Server hat keine Datei-URL zurückgegeben');
        }

        return response;
      } catch (error) {
        throw new Error(`Upload fehlgeschlagen: ${error.message}`);
      }
    },
    GenerateImage: () => Promise.resolve({ url: '' }),
    ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
      if (!file_url) throw new Error('file_url erforderlich');
      const response = await api.post('/api/analyze-photo', { image: file_url });
      return {
        output: response.ok ? {
          species: response.species,
          length_cm: response.length_cm,
          weight_kg: response.weight_kg,
        } : null,
      };
    },
  },
};

// ── Nativer Functions-Client (Teil der base44-Ablösung) ──────────────────────
// invoke(name, data) -> ruft die in FUNCTION_MAP hinterlegte Backend-Funktion.
export const functions = {
  invoke: (name, data) => {
    const fn = FUNCTION_MAP[name];
    if (fn) return fn(data);
    return Promise.resolve({});
  },
};

// ── Analytics / AppLogs (native No-op-Clients) ───────────────────────────────
// Geben ein Promise zurück, da Aufrufer .then()/.catch() verketten (wie beim
// base44-SDK). Andernfalls: "Cannot read properties of undefined (reading 'catch')".
export const analytics = { track: () => Promise.resolve() };
export const appLogs   = { logUserInApp: () => Promise.resolve() };

// ── Einzeln exportierte API-Module (für direkte Nutzung) ─────────────────────
export const catches = {
  list:   (p = {}) => api.get(`/api/catches?limit=${p.limit||50}&offset=${p.offset||0}`),
  get:    (id)     => api.get(`/api/catches/${id}`),
  create: (data)   => api.post('/api/catches', data),
  update: (id, d)  => api.patch(`/api/catches/${id}`, d),
  delete: (id)     => api.del(`/api/catches/${id}`),
  stats:  ()       => api.get('/api/catches/stats/summary'),
};

export const spots = {
  list:   ()       => api.get('/api/spots'),
  create: (data)   => api.post('/api/spots', data),
  update: (id, d)  => api.patch(`/api/spots/${id}`, d),
  delete: (id)     => api.del(`/api/spots/${id}`),
  public: ()       => api.get('/api/spots/public'),
};

export const ai = {
  chat:              (messages, userLocation) => api.post('/api/ai/chat', { messages, userLocation }),
  analyzeCatch:      (file_url, image_base64) => api.post('/api/ai/analyze-catch', { file_url, image_base64 }),
  fishingRecommend:  (lat, lng)               => api.post('/api/ai/fishing-recommendation', { latitude: lat, longitude: lng }),
  evaluateCatch:     (catch_data, context)    => api.post('/api/ai/evaluate-catch', { catch_data, context }),
  generateReport:    (period)                 => api.post('/api/ai/generate-catch-report', { period }),
  tts:               (text, voice)            => api.post('/api/ai/tts', { text, voice }),
  fishBehavior:      (species, waterData, airPressure, lat, lng) => api.post('/api/ai/fish-behavior-analysis', {
    species,
    water_data: waterData,
    air_pressure: airPressure,
    latitude: lat,
    longitude: lng
  }),
};

export const weather = {
  get: (lat, lng, spotName) => api.post('/api/weather', { latitude: lat, longitude: lng, spotName }),
  // Amtliche Unwetterwarnungen (DWD) für den Standort
  alerts: (lat, lng) => api.post('/api/weather/alerts', { latitude: lat, longitude: lng }),
};

export const community = {
  posts:      ()     => api.get('/api/community/posts'),
  createPost: (data) => api.post('/api/community/posts', data),
  deletePost: (id)   => api.del(`/api/community/posts/${id}`),
  likePost:   (id)   => api.post(`/api/community/posts/${id}/like`),
  votingBoard: ()    => api.get('/api/community/voting/leaderboard'),
  submitVote: (data) => api.post('/api/community/voting/submit', data),
  likeVote:   (id)   => api.post(`/api/community/voting/${id}/like`),
  createClan: (data) => api.post('/api/community/clans', data),
  joinClan:   (id)   => api.post(`/api/community/clans/${id}/join`),
  clanBoard:  (id)   => api.get(`/api/community/clans/${id}/leaderboard`),
};

export const premium = {
  status:       ()          => api.get('/api/premium/status'),
  products:     ()          => api.get('/api/premium/products'),
  checkFeature: (feature)   => api.post('/api/premium/check-feature', { feature }),
  checkout:     (plan_id)   => api.post('/api/premium/checkout', { plan_id }),
  activateDemo: ()          => api.post('/api/premium/activate-demo'),
};

export const fishing = {
  rules:       ()          => api.get('/api/fishing/rules'),
  activeRules: ()          => api.get('/api/fishing/rules/active'),
  clubs:       (city)      => api.get(`/api/fishing/clubs${city ? '?city='+city : ''}`),
  nearbyClubs: (lat, lng)  => api.post('/api/fishing/clubs/nearby', { latitude: lat, longitude: lng }),
  licenses:    ()          => api.get('/api/fishing/licenses'),
  addLicense:  (data)      => api.post('/api/fishing/licenses', data),
  plans:       ()          => api.get('/api/fishing/plans'),
  createPlan:  (data)      => api.post('/api/fishing/plans', data),
  deletePlan:  (id)        => api.del(`/api/fishing/plans/${id}`),
  hotspots:    ()          => api.get('/api/fishing/hotspots'),
};

export const events = {
  // Event Management
  list:              ()                => api.get('/api/events'),
  get:               (id)              => api.get(`/api/events/${id}`),
  create:            (data)            => api.post('/api/events', data),
  update:            (id, data)        => api.patch(`/api/events/${id}`, data),
  delete:            (id)              => api.del(`/api/events/${id}`),

  // Templates
  templates:         ()                => api.get('/api/events/templates'),
  template:          (id)              => api.get(`/api/events/templates/${id}`),

  // Participation
  join:              (id)              => api.post(`/api/events/${id}/join`),
  leave:             (id)              => api.post(`/api/events/${id}/leave`),
  participants:      (id)              => api.get(`/api/events/${id}/participants`),
  leaderboard:       (id)              => api.get(`/api/events/${id}/leaderboard`),

  // Submissions
  submit:            (id, data)        => api.post(`/api/events/${id}/submit`, data),

  // Invitations
  invite:            (id, emails)      => api.post(`/api/events/${id}/invite`, { invitee_emails: emails }),
  myInvitations:     ()                => api.get('/api/events/invitations/me'),
  acceptInvitation:  (id)              => api.post(`/api/events/invitations/${id}/accept`),
  declineInvitation: (id)              => api.post(`/api/events/invitations/${id}/decline`),

  // Activity Tracking (Trips, AI Interactions, KI Buddy)
  trackActivity:     (eventId, type)   => api.post('/api/events/activities/track', { eventId, activityType: type }),
  listActivities:    ()                => api.get('/api/events/activities/list'),
  getCurrentPoints:  ()                => api.get('/api/events/user/current-points'),
  getActiveEvent:    ()                => api.get('/api/events/user/active-event'),

  // Community Competition Integration
  startCompetition:  (templateId)      => api.post('/api/community/competitions/start', { template_id: templateId }),
};

export const leaderboards = {
  monthly:           (year, month)     => api.get(`/api/leaderboards/monthly?year=${year}&month=${month}`),
};

export const rewards = {
  myActivations:     ()                => api.get('/api/rewards/my-activations'),
  claim:             (leaderboardId)   => api.post('/api/rewards/claim', { leaderboard_id: leaderboardId }),
};

export const gear = {
  list:       ()      => api.get('/api/gear'),
  create:     (data)  => api.post('/api/gear', data),
  update:     (id, d) => api.patch(`/api/gear/${id}`, d),
  delete:     (id)    => api.del(`/api/gear/${id}`),
  baits:      ()      => api.get('/api/gear/baits'),
  createBait: (data)  => api.post('/api/gear/baits', data),
};

export const water = {
  analyze: (lat, lng, name) => api.post('/api/water', { latitude: lat, longitude: lng, spotName: name }),
  history: ()               => api.get('/api/water/history'),
};

export const user = {
  deleteAccount: () => api.del('/api/user/account'),
  startSession:  (feature) => api.post('/api/user/sessions/start', { feature }),
  endSession:    (id)       => api.post(`/api/user/sessions/${id}/end`),
};
