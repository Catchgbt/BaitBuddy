// ============================================================
// CatchGBT – apiClient.js
// Ersetzt: src/api/base44Client.js + src/api/integrations.js
//
// Verwendung im Frontend genauso wie vorher:
//   import { base44 } from './base44Client';
//   const result = await base44.functions.invoke('catchgbtChat', { messages });
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// ── Token Management ──────────────────────────────────────────────────────

function getToken() {
  // Supabase speichert den Token so:
  return localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token') || null;
}

// ── Core fetch helper ─────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });

  // Audio-Antworten direkt zurückgeben
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('audio')) return res;

  // Tiles (images) direkt zurückgeben
  if (ct.includes('image')) return res;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

async function apiPost(path, body = {}) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`${path}${qs ? '?' + qs : ''}`);
}

// ── base44-kompatibler API-Namespace ──────────────────────────────────────

export const base44 = {
  /**
   * functions.invoke('functionName', params)
   * Entspricht genau dem Base44 SDK-Aufruf.
   */
  functions: {
    invoke: async (name, params = {}) => {
      const data = await apiPost(`/api/${name}`, params);
      return { data };  // Base44 gab { data } zurück
    }
  },

  /**
   * Auth-Methoden (werden jetzt von Supabase Auth übernommen).
   * Diese Methoden hier sind Stubs – die echte Auth läuft über @supabase/supabase-js.
   * Sie sind nur da, damit alten Code, der base44.auth.me() aufruft, nicht bricht.
   */
  auth: {
    me: async () => {
      // Supabase gibt den User aus dem lokalen Store zurück
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      // Flaches Objekt wie Base44 User zurückgeben
      return { id: user.id, email: user.email, ...user.user_metadata };
    },
    redirectToLogin: (returnUrl = '/') => {
      window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    },
    logout: async (returnUrl = '/') => {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      await sb.auth.signOut();
      window.location.href = returnUrl;
    },
    isAuthenticated: async () => {
      const token = getToken();
      return !!token;
    },
    updateMe: async (data) => {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const { error } = await sb.auth.updateUser({ data });
      if (error) throw error;
    }
  }
};

// ── Einzelne Convenience-Exports ─────────────────────────────────────────

export const invoke = (name, params) => base44.functions.invoke(name, params);

export default base44;
