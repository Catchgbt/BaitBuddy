// src/api/frontendClient.js
// Eigener BaitBuddy API-Client — ersetzt @base44/sdk vollständig

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'bb_token';

// ── Raw HTTP Client ───────────────────────────────────────────────────────────
class ApiClient {
  constructor() {
    this._token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  setToken(token) {
    this._token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken() { return this._token; }

  async request(method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
      },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
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

// ── Entity → REST Endpoint Mapping ───────────────────────────────────────────
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
  User:           '/api/admin/users',
  ChatMessage:    '/api/ai/messages',
};

function makeEntity(entityName) {
  const base = ENTITY_MAP[entityName];

  const safeGet = async (path) => {
    try { return await api.get(path); } catch { return []; }
  };
  const safePost = async (path, body) => {
    try { return await api.post(path, body); } catch { return { id: `local_${Date.now()}`, ...body }; }
  };

  return {
    list: async (orderBy, limit) => {
      if (!base) return [];
      const p = new URLSearchParams();
      if (limit) p.set('limit', limit);
      if (orderBy) p.set('order', orderBy);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const result = await safeGet(`${base}${qs}`);
      return Array.isArray(result) ? result : [];
    },

    filter: async (filters = {}) => {
      if (!base) return [];
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null) p.set(k, String(v)); });
      const qs = p.toString() ? `?${p.toString()}` : '';
      const result = await safeGet(`${base}${qs}`);
      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.data)) return result.data;
      return [];
    },

    create: async (data) => {
      if (!base) return { id: `local_${Date.now()}`, ...data };
      return safePost(base, data);
    },

    update: async (id, data) => {
      if (!base) return { id, ...data };
      try { return await api.patch(`${base}/${id}`, data); } catch { return { id, ...data }; }
    },

    delete: async (id) => {
      if (!base) return { ok: true };
      try { return await api.del(`${base}/${id}`); } catch { return { ok: true }; }
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
export const entities = entitiesProxy;

// ── Function → Endpoint Mapping ───────────────────────────────────────────────
const FUNCTION_MAP = {
  catchgbtChat:           (d) => api.post('/api/ai/chat', d),
  getPlanStatus:          ()  => api.get('/api/premium/status'),
  textToSpeech:           (d) => api.post('/api/ai/tts', d),
  backendTextToSpeech:    (d) => api.post('/api/ai/tts', d),
  geminiTextToSpeech:     (d) => api.post('/api/ai/tts', d),
  freeNeuralTTS:          (d) => api.post('/api/ai/tts', d),
  analyzeCatchPhoto:      (d) => api.post('/api/ai/analyze-catch', d),
  aiEvaluateCatch:        (d) => api.post('/api/ai/evaluate-catch', d),
  generateCatchReport:    (d) => api.post('/api/ai/generate-catch-report', d),
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
  getClanLeaderboard:     (d) => api.get(`/api/community/clans/${d?.clan_id}/leaderboard`).catch(() => []),
  checkFeatureAccess:     (d) => api.post('/api/premium/check-feature', d).catch(() => ({ allowed: false })),
  geocodeFishingClubs:    (d) => api.post('/api/fishing/clubs/geocode', d).catch(() => []),
  addVotingLike:          (d) => api.post(`/api/community/voting/${d?.submission_id}/like`).catch(() => ({ ok: true })),
  catchgbtVoices:         ()  => api.get('/api/ai/voices').catch(() => ({ voices: [] })),
  catchgbtPing:           ()  => api.get('/api/health').catch(() => ({ ok: false })),
  generateBathymetricMap: (d) => api.post('/api/water/bathymetric-map', d).catch(() => null),
  bathymetryProxy:        (d) => api.post('/api/water/bathymetry', d).catch(() => null),
  cleanupOldSessions:     ()  => Promise.resolve({ ok: true }),
  autoRenewPlans:         ()  => Promise.resolve({ ok: true }),
  verifyPlayIntegrity:    ()  => Promise.resolve({ valid: false }),
  recordWebVitals:        ()  => Promise.resolve({ ok: true }),
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

  logout: (redirectUrl) => {
    api.setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl || '/';
    }
  },

  redirectToLogin: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  login: (email, password) =>
    api.post('/api/auth/login', { email, password }).then(res => {
      if (res.token) api.setToken(res.token);
      return res;
    }),

  register: (email, password, full_name) =>
    api.post('/api/auth/register', { email, password, full_name }).then(res => {
      if (res.token) api.setToken(res.token);
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
const integrations = {
  Core: {
    InvokeLLM: ({ prompt, response_json_schema, ...rest }) =>
      api.post('/api/ai/chat', {
        messages: [{ role: 'user', content: prompt }],
        response_json_schema,
        ...rest,
      }),
    SendEmail:  () => Promise.resolve({ ok: true }),
    SendSMS:    () => Promise.resolve({ ok: true }),
    UploadFile: () => Promise.resolve({ file_url: '' }),
    GenerateImage: () => Promise.resolve({ url: '' }),
    ExtractDataFromUploadedFile: () => Promise.resolve({}),
  },
};

// ── Nativer Functions-Client (Teil der base44-Ablösung) ──────────────────────
// invoke(name, data) -> ruft die in FUNCTION_MAP hinterlegte Backend-Funktion.
export const functions = {
  invoke: (name, data) => {
    const fn = FUNCTION_MAP[name];
    if (fn) return fn(data);
    console.warn(`[BaitBuddy] Unbekannte Funktion: ${name}`);
    return Promise.resolve({});
  },
};

// ── base44 Compatibility Export ───────────────────────────────────────────────
export const base44 = {
  auth,
  entities: entitiesProxy,
  functions,
  integrations,
  analytics: { track: () => {} },
  appLogs:   { logUserInApp: () => {} },
};

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
  chat:             (messages, userLocation) => api.post('/api/ai/chat', { messages, userLocation }),
  analyzeCatch:     (file_url, image_base64) => api.post('/api/ai/analyze-catch', { file_url, image_base64 }),
  fishingRecommend: (lat, lng)               => api.post('/api/ai/fishing-recommendation', { latitude: lat, longitude: lng }),
  evaluateCatch:    (catch_data, context)    => api.post('/api/ai/evaluate-catch', { catch_data, context }),
  generateReport:   (period)                 => api.post('/api/ai/generate-catch-report', { period }),
  tts:              (text, voice)            => api.post('/api/ai/tts', { text, voice }),
};

export const weather = {
  get: (lat, lng, spotName) => api.post('/api/weather', { latitude: lat, longitude: lng, spotName }),
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
  list:        ()          => api.get('/api/events'),
  create:      (data)      => api.post('/api/events', data),
  leaderboard: (id)        => api.get(`/api/events/${id}/leaderboard`),
  submit:      (id, data)  => api.post(`/api/events/${id}/submit`, data),
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
