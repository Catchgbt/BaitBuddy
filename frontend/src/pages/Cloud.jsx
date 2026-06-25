import { useEffect, useMemo, useState } from 'react';
import {
  Cloud as CloudIcon,
  CloudOff,
  RefreshCw,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  HardDrive,
  Timer,
  Server,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribe,
  isOnline,
  isSyncing,
  syncNow,
  listPending,
  clearQueue,
  getSettings,
  setAutoEnabled,
  setIntervalMinutes,
  getIntervalChoices,
  getStorageInfo,
  downloadBackup,
  getRemoteStatus,
} from '@/api/syncManager';

const ENTITY_LABEL = {
  catches: 'Fang',
  spots: 'Spot',
};

const OP_LABEL = {
  insert: 'Anlegen',
  update: 'Aktualisieren',
  delete: 'Loeschen',
};

function formatBytes(bytes) {
  if (bytes == null) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatRelative(iso) {
  if (!iso) return 'Noch nie';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'Gerade eben';
  if (sec < 60) return `Vor ${sec} Sek.`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `Vor ${days} Tag(en)`;
}

function StatusPill({ ok, labelOk, labelFail, IconOk, IconFail }) {
  const Icon = ok ? IconOk : IconFail;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-sm ${
      ok ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
         : 'bg-red-900/30 border-red-700/40 text-red-300'
    }`}>
      <Icon size={16} />
      <span className="font-medium">{ok ? labelOk : labelFail}</span>
    </div>
  );
}

export default function Cloud() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(isSyncing());
  const [pending, setPending] = useState([]);
  const [settings, setSettings] = useState(getSettings());
  const [storage, setStorage] = useState({ localStorageBytes: 0, quotaBytes: null, usageBytes: null });
  const [serverStatus, setServerStatus] = useState({ reachable: false, checking: true });
  const [confirmingClear, setConfirmingClear] = useState(false);

  const intervalChoices = useMemo(() => getIntervalChoices(), []);

  const refreshAll = async () => {
    setPending(await listPending());
    setSettings(getSettings());
    setStorage(await getStorageInfo());
    setOnline(isOnline());
    setSyncing(isSyncing());
  };

  useEffect(() => {
    refreshAll();
    const unsubscribe = subscribe(() => { refreshAll(); });
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsubscribe();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setServerStatus(s => ({ ...s, checking: true }));
    getRemoteStatus().then(result => {
      if (!cancelled) setServerStatus({ ...result, checking: false });
    });
    return () => { cancelled = true; };
  }, [online, settings.lastSyncAt]);

  const handleSync = async () => {
    if (syncing) return;
    if (!online) {
      toast.error('Offline – Sync nicht möglich');
      return;
    }
    if (pending.length === 0) {
      const remote = await getRemoteStatus();
      setServerStatus({ ...remote, checking: false });
      if (remote.reachable) {
        toast.success('Alles synchron');
      } else {
        toast.error('Server nicht erreichbar');
      }
      return;
    }
    setSyncing(true);
    const result = await syncNow();
    setSyncing(false);
    await refreshAll();
    if (result?.skipped) {
      toast.info('Sync übersprungen');
      return;
    }
    qc.invalidateQueries({ queryKey: ['catches'] });
    qc.invalidateQueries({ queryKey: ['spots'] });
    if (result.failed === 0) {
      toast.success(`${result.synced} Eintrag/Einträge synchronisiert`);
    } else if (result.synced > 0) {
      toast.warning(`${result.synced} synchronisiert, ${result.failed} fehlgeschlagen`);
    } else {
      toast.error(`Sync fehlgeschlagen: ${result.errors?.[0] || 'Unbekannter Fehler'}`);
    }
  };

  const handleToggleAuto = () => {
    const next = !settings.autoEnabled;
    setAutoEnabled(next);
    setSettings(getSettings());
    toast.success(next ? 'Auto-Sync aktiviert' : 'Auto-Sync deaktiviert');
  };

  const handleInterval = (mins) => {
    setIntervalMinutes(mins);
    setSettings(getSettings());
    toast.success(`Intervall: ${mins} Min.`);
  };

  const handleClearCache = async () => {
    if (pending.length > 0 && !confirmingClear) {
      setConfirmingClear(true);
      toast.warning('Achtung: Es gibt unsynchronisierte Einträge. Erneut tippen zum Bestätigen.');
      setTimeout(() => setConfirmingClear(false), 5000);
      return;
    }
    await clearQueue();
    setConfirmingClear(false);
    toast.success('Lokale Warteschlange geleert');
    await refreshAll();
  };

  const handleExport = async () => {
    try {
      await downloadBackup();
      toast.success('Backup heruntergeladen');
    } catch (e) {
      toast.error(`Export fehlgeschlagen: ${e.message}`);
    }
  };

  const pendingByEntity = useMemo(() => {
    const map = {};
    for (const p of pending) {
      const key = p.entity || 'sonstige';
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [pending]);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cloud-Status</h1>
          <p className="text-xs text-gray-400 mt-0.5">Lokale Daten und Supabase-Synchronisierung</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncing ? 'Synchronisiere' : 'Jetzt synchronisieren'}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <StatusPill
          ok={online}
          IconOk={Wifi}
          IconFail={WifiOff}
          labelOk="Online"
          labelFail="Offline"
        />
        <StatusPill
          ok={serverStatus.reachable}
          IconOk={Server}
          IconFail={CloudOff}
          labelOk="Server erreichbar"
          labelFail={serverStatus.checking ? 'Prüfe Server' : 'Server nicht erreichbar'}
        />
      </section>

      <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudIcon size={18} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Synchronisierung</h2>
          </div>
          <span className="text-xs text-gray-400">Letzter Sync: {formatRelative(settings.lastSyncAt)}</span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-gray-950/60 p-3 border border-gray-800">
          <div>
            <p className="text-sm text-white font-medium">Auto-Sync</p>
            <p className="text-xs text-gray-400">Im Hintergrund automatisch hochladen</p>
          </div>
          <button
            onClick={handleToggleAuto}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.autoEnabled ? 'bg-cyan-500' : 'bg-gray-700'
            }`}
            aria-label="Auto-Sync umschalten"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.autoEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Timer size={14} className="text-gray-400" />
            <p className="text-xs uppercase tracking-wider text-gray-400">Intervall</p>
          </div>
          <div className="flex gap-2">
            {intervalChoices.map(m => (
              <button
                key={m}
                onClick={() => handleInterval(m)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium border transition-colors ${
                  settings.intervalMinutes === m
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {m} Min.
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Wartende Einträge</h2>
          </div>
          <span className="text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded-full">{pending.length}</span>
        </div>

        {pending.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-900/20 border border-emerald-800/40 p-3">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-200">Alle lokalen Daten sind synchronisiert.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(pendingByEntity).map(([entity, count]) => (
                <span key={entity} className="text-xs text-cyan-200 bg-cyan-900/30 border border-cyan-800/50 rounded-full px-3 py-1">
                  {(ENTITY_LABEL[entity] || entity)}: {count}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
              {pending.slice(0, 8).map(item => (
                <li key={item.id} className="p-3 bg-gray-950/60">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {(ENTITY_LABEL[item.entity] || item.entity)} – {OP_LABEL[item.op] || item.op}
                      </p>
                      <p className="text-xs text-gray-500">{formatRelative(item.createdAt)}</p>
                    </div>
                    {item.attempts > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-300">
                        <AlertTriangle size={12} /> {item.attempts}
                      </span>
                    )}
                  </div>
                  {item.lastError && (
                    <p className="text-xs text-red-400 mt-1 truncate">{item.lastError}</p>
                  )}
                </li>
              ))}
            </ul>
            {pending.length > 8 && (
              <p className="text-xs text-gray-500 text-center">+ {pending.length - 8} weitere Einträge</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Lokaler Speicher</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
            <p className="text-xs text-gray-400">localStorage</p>
            <p className="text-lg font-bold text-white mt-1">{formatBytes(storage.localStorageBytes)}</p>
          </div>
          <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
            <p className="text-xs text-gray-400">Browser-Kontingent</p>
            <p className="text-lg font-bold text-white mt-1">{formatBytes(storage.usageBytes)}</p>
            {storage.quotaBytes != null && (
              <p className="text-[10px] text-gray-500">von {formatBytes(storage.quotaBytes)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 transition-colors"
          >
            <Download size={16} /> Backup exportieren
          </button>
          <button
            onClick={handleClearCache}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-medium py-2 transition-colors ${
              confirmingClear
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <Trash2 size={16} /> {confirmingClear ? 'Wirklich leeren?' : 'Warteschlange leeren'}
          </button>
        </div>
      </section>

      <p className="text-[11px] text-gray-500 text-center pt-2">
        Daten werden lokal in IndexedDB gespeichert und an Supabase übertragen, sobald eine Verbindung besteht.
      </p>
    </div>
  );
}
