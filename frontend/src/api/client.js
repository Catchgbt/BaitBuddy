import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const BACKEND = Capacitor.isNativePlatform()
  ? 'https://bait-buddy.vercel.app'
  : (import.meta.env.VITE_BACKEND_URL ?? '');

function validUrl(val) {
  try { return /^https?:\/\/.+/.test(val) && !!new URL(val) && val; } catch { return ''; }
}

const SUPABASE_URL = validUrl(import.meta.env.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getToken() {
  try {
    const host = new URL(SUPABASE_URL).hostname.split('.')[0];
    const raw = localStorage.getItem(`sb-${host}-auth-token`);
    return JSON.parse(raw)?.access_token || null;
  } catch { return null; }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => apiFetch(path),
  post:   (path, body)  => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)  => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (path, body)  => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => apiFetch(path, { method: 'DELETE' }),
};
