import { createClient } from '@supabase/supabase-js';

const BACKEND = import.meta.env.VITE_BACKEND_URL ||
  'https://yejiqenqdzupauddjcyi.supabase.co/functions/v1/api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
  'https://yejiqenqdzupauddjcyi.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllamlxZW5xZHp1cGF1ZGRqY3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc2NzIsImV4cCI6MjA5NTE0MzY3Mn0.KGxv8U9Zr1EC1ItAPYL4oy4rAaZjAmGVGGw1VsGKLbE';

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
