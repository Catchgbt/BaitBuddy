import { supabaseUrl } from './supabase.js';

// Mehrere Routen (Bathymetrie-Upload, Foto-Analyse) fetchen serverseitig eine
// vom Client genannte URL (in der Praxis immer eine zuvor selbst hochgeladene
// Supabase-Storage-Datei). Ohne Host-Whitelist waere das ein SSRF-Gadget:
// requireAuth-geschuetzt, aber der Server wuerde jede vom Client genannte URL
// abrufen (interne Dienste, Cloud-Metadaten-Endpunkte, ...).
export function isAllowedFetchUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return parsed.hostname === new URL(supabaseUrl).hostname;
  } catch {
    return false;
  }
}
