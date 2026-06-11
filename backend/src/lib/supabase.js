import { createClient } from '@supabase/supabase-js';

// Öffentliche Projekt-URL als Default (kein Secret) — so muss in Vercel nur noch
// SUPABASE_SERVICE_ROLE_KEY gesetzt werden, damit das Backend funktioniert.
const url = process.env.SUPABASE_URL || 'https://yejiqenqdzupauddjcyi.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const supabaseUrl = url;
export const supabaseKey = key;

export const supabase = createClient(url, key, { auth: { persistSession: false } });
