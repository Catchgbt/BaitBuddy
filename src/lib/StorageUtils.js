// Safe wrapper für localStorage JSON operations
export function safeParse(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[StorageUtils] Parse error for key "${key}":`, err);
    try {
      localStorage.removeItem(key);
    } catch {}
    return defaultValue;
  }
}

export function safeStringify(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[StorageUtils] Stringify error for key "${key}":`, err);
    return false;
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[StorageUtils] Remove error for key "${key}":`, err);
    return false;
  }
}
