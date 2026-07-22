// In-Memory-TTL-Cache für das Express-Backend (Phase 4: Backend-Skalierung).
//
// Zweck: Häufig abgerufene, selten geänderte Daten (z. B. die Liste aktiver
// Wettbewerbe) für kurze Zeit im RAM vorhalten, damit nicht jeder Request einen
// Supabase-Roundtrip auslöst. Das reduziert die DB-Last unter Spitzenlast
// spürbar, ohne zusätzliche Infrastruktur — der Cache lebt im Prozess.
//
// Vercel-Hinweis: Auf Vercel Serverless hat jede warme Lambda-Instanz ihren
// eigenen Prozess-Cache. Der Cache greift also PRO Instanz (über warme
// Invocations hinweg), nicht global. Das ist gewollt und bleibt innerhalb
// „nur Vercel & Supabase" (kein externer Store nötig). Für instanzübergreifende
// Zähler bleibt Vercel KV zuständig (siehe middleware/rateLimit.js); für reine
// Lese-Caches genügt der Prozess-Cache.
//
// Bewusst ohne externe Abhängigkeit (kein node-cache): die benötigte Logik ist
// klein, gut testbar und vermeidet zusätzliches Bundle-Gewicht.

export class MemoryCache {
  /**
   * @param {{ defaultTtlMs?: number, maxEntries?: number, now?: () => number }} [options]
   */
  constructor({ defaultTtlMs = 30000, maxEntries = 500, now = Date.now } = {}) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this._now = now;
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this._store = new Map();
  }

  // Liefert den gecachten Wert oder undefined, wenn nicht vorhanden oder
  // abgelaufen. Abgelaufene Einträge werden dabei gleich entfernt (Lazy-Sweep).
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this._now()) {
      this._store.delete(key);
      return undefined;
    }
    // Re-Insert hält den Eintrag im Sinne einer LRU „frisch" (Map bewahrt die
    // Einfügereihenfolge — das jüngste Set landet hinten).
    this._store.delete(key);
    this._store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    // Kapazitätsgrenze: bei Überlauf den ältesten Eintrag verdrängen (LRU),
    // damit der Cache nicht unbegrenzt wächst.
    if (!this._store.has(key) && this._store.size >= this.maxEntries) {
      const oldest = this._store.keys().next().value;
      if (oldest !== undefined) this._store.delete(oldest);
    }
    this._store.set(key, { value, expiresAt: this._now() + ttlMs });
    return value;
  }

  // Cache-Aside: bei Treffer den Wert liefern, sonst `producer()` ausführen,
  // Ergebnis cachen und zurückgeben. Fehler aus `producer()` werden NICHT
  // gecacht (kein Negativ-Caching) — der nächste Aufruf versucht es erneut.
  async wrap(key, producer, ttlMs = this.defaultTtlMs) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await producer();
    // undefined nie cachen — sonst wäre ein Treffer nicht von „leer" unterscheidbar.
    if (value !== undefined) this.set(key, value, ttlMs);
    return value;
  }

  // Einzelnen Schlüssel invalidieren (nach einer Mutation der Quelldaten).
  delete(key) {
    return this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }

  get size() {
    return this._store.size;
  }
}

export default MemoryCache;
