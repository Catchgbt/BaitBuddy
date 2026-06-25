import { api } from './client';

const DB_NAME = 'baitbuddy-sync';
const DB_VERSION = 1;
const STORE = 'queue';

const STORAGE_KEYS = {
  enabled: 'baitbuddy.sync.autoEnabled',
  interval: 'baitbuddy.sync.intervalMinutes',
  lastSync: 'baitbuddy.sync.lastSyncAt',
};

const DEFAULT_INTERVAL_MIN = 5;
const INTERVAL_CHOICES = [1, 5, 15, 30];

let listeners = new Set();
let autoTimer = null;
let onlineListener = null;
let offlineListener = null;
let syncInFlight = false;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('entity', 'entity', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then(value => { result = value; }).catch(reject);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function notify() {
  for (const cb of listeners) {
    try { cb(); } catch {}
  }
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function queueChange({ entity, op, payload, id = null }) {
  const item = {
    entity,
    op,
    payload,
    targetId: id,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  await tx('readwrite', store => new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  notify();
}

export async function listPending() {
  return tx('readonly', store => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

export async function countPending() {
  return tx('readonly', store => new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  }));
}

async function removeItem(id) {
  return tx('readwrite', store => new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

async function markFailed(id, message) {
  return tx('readwrite', store => new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result;
      if (!current) return resolve();
      current.attempts = (current.attempts || 0) + 1;
      current.lastError = message;
      const put = store.put(current);
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    };
    getReq.onerror = () => reject(getReq.error);
  }));
}

export async function clearQueue() {
  await tx('readwrite', store => new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
  notify();
}

export function getSettings() {
  const enabledRaw = localStorage.getItem(STORAGE_KEYS.enabled);
  const intervalRaw = parseInt(localStorage.getItem(STORAGE_KEYS.interval) || '', 10);
  const lastSync = localStorage.getItem(STORAGE_KEYS.lastSync) || null;
  return {
    autoEnabled: enabledRaw === null ? true : enabledRaw === 'true',
    intervalMinutes: INTERVAL_CHOICES.includes(intervalRaw) ? intervalRaw : DEFAULT_INTERVAL_MIN,
    lastSyncAt: lastSync,
  };
}

export function setAutoEnabled(value) {
  localStorage.setItem(STORAGE_KEYS.enabled, value ? 'true' : 'false');
  rescheduleAuto();
  notify();
}

export function setIntervalMinutes(minutes) {
  const safe = INTERVAL_CHOICES.includes(minutes) ? minutes : DEFAULT_INTERVAL_MIN;
  localStorage.setItem(STORAGE_KEYS.interval, String(safe));
  rescheduleAuto();
  notify();
}

export function getIntervalChoices() {
  return [...INTERVAL_CHOICES];
}

function setLastSync(ts) {
  localStorage.setItem(STORAGE_KEYS.lastSync, ts);
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

async function loadServerPending() {
  try {
    return await api.get('/api/sync/pending');
  } catch (e) {
    return { items: [], error: e.message };
  }
}

export async function getStorageInfo() {
  let estimate = null;
  if (navigator.storage && typeof navigator.storage.estimate === 'function') {
    try { estimate = await navigator.storage.estimate(); } catch {}
  }
  let localBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const v = localStorage.getItem(k);
    if (k) localBytes += k.length;
    if (v) localBytes += v.length;
  }
  return {
    localStorageBytes: localBytes * 2,
    quotaBytes: estimate?.quota ?? null,
    usageBytes: estimate?.usage ?? null,
  };
}

export async function exportBackup() {
  const pending = await listPending();
  const settings = getSettings();
  const localData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith('sb-') && k.endsWith('-auth-token')) continue;
    localData[k] = localStorage.getItem(k);
  }
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings,
    pendingItems: pending,
    localStorage: localData,
  };
}

export async function downloadBackup() {
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `baitbuddy-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function uploadItem(item) {
  const body = {
    entity: item.entity,
    op: item.op,
    payload: item.payload,
    targetId: item.targetId,
    clientId: item.id,
    createdAt: item.createdAt,
  };
  return api.post('/api/sync/upload', { items: [body] });
}

export async function syncNow() {
  if (syncInFlight) return { skipped: true, reason: 'already-running' };
  if (!isOnline()) return { skipped: true, reason: 'offline' };
  syncInFlight = true;
  notify();
  const pending = await listPending();
  let synced = 0;
  let failed = 0;
  const errors = [];
  try {
    for (const item of pending) {
      try {
        const result = await uploadItem(item);
        const status = result?.results?.[0];
        if (status && status.ok === false) {
          await markFailed(item.id, status.error || 'Unbekannter Fehler');
          failed++;
          errors.push(status.error || 'Unbekannter Fehler');
        } else {
          await removeItem(item.id);
          synced++;
        }
      } catch (e) {
        await markFailed(item.id, e.message);
        failed++;
        errors.push(e.message);
      }
    }
    setLastSync(new Date().toISOString());
  } finally {
    syncInFlight = false;
    notify();
  }
  return { synced, failed, errors };
}

export async function getRemoteStatus() {
  if (!isOnline()) {
    return { online: false, reachable: false };
  }
  try {
    const data = await api.get('/api/sync/status');
    return { online: true, reachable: true, ...data };
  } catch (e) {
    return { online: true, reachable: false, error: e.message };
  }
}

export async function fetchRemotePending() {
  if (!isOnline()) return { items: [], reachable: false };
  const data = await loadServerPending();
  return { items: data?.items || [], reachable: !data?.error, error: data?.error || null };
}

function rescheduleAuto() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
  const { autoEnabled, intervalMinutes } = getSettings();
  if (!autoEnabled) return;
  autoTimer = setInterval(() => {
    if (isOnline()) {
      syncNow().catch(() => {});
    }
  }, intervalMinutes * 60 * 1000);
}

export function startSyncManager() {
  if (typeof window === 'undefined') return;
  rescheduleAuto();
  if (!onlineListener) {
    onlineListener = () => {
      notify();
      const { autoEnabled } = getSettings();
      if (autoEnabled) syncNow().catch(() => {});
    };
    offlineListener = () => notify();
    window.addEventListener('online', onlineListener);
    window.addEventListener('offline', offlineListener);
  }
}

export function isSyncing() {
  return syncInFlight;
}
