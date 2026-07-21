import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

// autoRefreshToken bewusst deaktiviert: BaitBuddy hat zwei parallele
// Session-Systeme (bb_token/bb_refresh via Backend-Proxy für den normalen
// E-Mail/Passwort-Login, plus diese Browser-Supabase-Session für OAuth/
// Passwort-Reset). Beide rotieren denselben, einmaligen Supabase-Refresh-
// Token — liefen bisher BEIDE autoRefreshToken (dieser Client) UND der
// 401-getriggerte Refresh in frontendClient.js parallel, konnte je nach
// Timing der jeweils andere mit einem bereits verbrauchten Refresh-Token
// scheitern. Mit deaktiviertem autoRefreshToken bleibt frontendClient.js
// der EINZIGE aktive Refresh-Pfad; AuthContext.jsx übernimmt per
// onAuthStateChange weiterhin SIGNED_IN/SIGNED_OUT-Events und spiegelt sie
// in bb_token/bb_refresh. Siehe CLAUDE.md ("Auth-Architektur").
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, flowType: 'pkce' },
});
