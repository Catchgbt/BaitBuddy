// Ad Remote Config — wird von /api/ads/config geladen und 5 Min. gecacht.
// Änderungen am Werbemodell ohne App-Update möglich. `ads_enabled` ist der
// Hauptschalter aus dem Admin-Bereich (Werbung für alle aus).
import { timeoutSignal } from '@/lib/abortCompat';

const CACHE_KEY = 'bb_ad_config';
// Kurz, damit „Werbung aus“ im Admin-Bereich zügig bei allen ankommt.
const CACHE_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_AD_CONFIG = {
  ads_enabled: true,

  guest_interstitial_enabled: true,
  guest_interstitial_cooldown_s: 120,
  guest_interstitial_duration_s: 30,
  guest_interstitial_skip_after_s: 30,

  basic_native_enabled: true,
  basic_native_interval: 4,   // jede N-te Listenposition

  basic_banner_enabled: true,

  basic_rewarded_enabled: true,
  basic_rewarded_rewards: ['ki_analyse', 'ki_voice_30min', 'satellite', 'premium_tool_1h'],

  pro_ads_enabled: false,
  ultimate_ads_enabled: false,
  day_pass_ads_enabled: false,
  trial_ads_enabled: false,
};

let _config = null;
let _fetchedAt = 0;
let _fetchPromise = null;
let _revision = 0;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL_MS && data && typeof data === 'object') {
      return { ts, data };
    }
  } catch {
    // ignorieren
  }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignorieren
  }
}

// Admin-Änderungen gelten sofort und dürfen nicht von einer älteren, noch
// laufenden Config-Anfrage oder beim erneuten Mount überschrieben werden.
export function updateAdConfig(patch) {
  _revision += 1;
  _config = { ...DEFAULT_AD_CONFIG, ..._config, ...patch };
  _fetchedAt = Date.now();
  writeCache(_config);
  return _config;
}

export async function loadAdConfig({ fresh = false } = {}) {
  if (_fetchPromise) return _fetchPromise;
  if (!fresh && _config && Date.now() - _fetchedAt < CACHE_TTL_MS) return _config;

  const cached = !fresh && readCache();
  if (cached) {
    _config = { ...DEFAULT_AD_CONFIG, ...cached.data };
    _fetchedAt = cached.ts;
    return _config;
  }

  const revision = _revision;
  _fetchPromise = (async () => {
    let next;
    try {
      const res = await fetch('/api/ads/config', {
        signal: timeoutSignal(4000),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        next = { ...DEFAULT_AD_CONFIG, ...data };
      } else {
        next = { ...DEFAULT_AD_CONFIG };
      }
    } catch {
      next = { ...DEFAULT_AD_CONFIG };
    }
    if (revision === _revision) {
      _config = next;
      _fetchedAt = Date.now();
      writeCache(_config);
    }
    return _config;
  })();

  try {
    return await _fetchPromise;
  } finally {
    _fetchPromise = null;
  }
}

export function getAdConfig() {
  return _config ?? DEFAULT_AD_CONFIG;
}
