import { createClient } from '@supabase/supabase-js';

// Service-Role Client (hat vollen Datenbankzugriff, nur serverseitig!)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Anon Client (für Auth-Operationen mit User-Token)
export const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
