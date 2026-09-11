import { createClient } from '@supabase/supabase-js';

// Öffentliche Projekt-URL als Default (kein Secret) — so muss in Vercel nur noch
// SUPABASE_SERVICE_ROLE_KEY gesetzt werden, damit das Backend funktioniert.
const url = process.env.SUPABASE_URL || 'https://yejiqenqdzupauddjcyi.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key || key === 'placeholder') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY Umgebungsvariable nicht konfiguriert oder invalid');
}

export const supabaseUrl = url;
export const supabaseKey = key;

// Basis-URL, unter der Storage-Objekte im BROWSER erreichbar sind.
//
// Bei der Supabase-Cloud ist das dieselbe Adresse wie SUPABASE_URL, deshalb der
// Default. Beim Self-Hosting fallen beide auseinander: das Backend spricht Kong
// containerintern unter http://kong:8000 an, ein Browser kann diesen Namen aber
// nicht auflösen. getPublicUrl() baut die URL immer aus SUPABASE_URL — ohne
// Umschreibung landen so unerreichbare Foto-Links in der Datenbank.
export const supabasePublicUrl = (process.env.SUPABASE_PUBLIC_URL || url).replace(/\/+$/, '');

// Ersetzt die interne Basis-URL durch die öffentliche. Ohne gesetztes
// SUPABASE_PUBLIC_URL bleibt die URL unverändert (Cloud-/Vercel-Verhalten).
export function toPublicStorageUrl(publicUrl) {
  if (!publicUrl || supabasePublicUrl === url.replace(/\/+$/, '')) return publicUrl;
  return publicUrl.replace(url.replace(/\/+$/, ''), supabasePublicUrl);
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });
