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
  Droplets,
  Mountain,
  Archive,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
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
  water_scenes: 'Wasserdaten',
};

const OP_LABEL = {
  insert: 'Anlegen',
  update: 'Aktualisieren',
  delete: 'Loeschen',
};

const QUALITY_LABEL = {
  low: 'Low',
  med: 'Mittel',
  high: 'Hoch',
  ultra: 'Ultra',
};

const QUALITY_SAMPLES = { low: 4, med: 8, high: 16, ultra: 24 };
const QUALITY_ORDER = ['low', 'med', 'high', 'ultra'];

const AUTO_BACKUP_KEY = 'baitbuddy.cloud.autoBackup';
const AUTO_BACKUP_LAST_KEY = 'baitbuddy.cloud.autoBackup.lastAt';
const QUALITY_KEY = 'baitbuddy.cloud.waterQuality';

function formatBytes(bytes) {
  if (bytes == null) return 'k.A.';
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

function getStoredQuality() {
  const v = localStorage.getItem(QUALITY_KEY);
  return QUALITY_ORDER.includes(v) ? v : 'med';
}

function getAutoBackup() {
  return localStorage.getItem(AUTO_BACKUP_KEY) === 'true';
}

function setAutoBackup(v) {
  localStorage.setItem(AUTO_BACKUP_KEY, v ? 'true' : 'false');
}

function lastAutoBackupAt() {
  return localStorage.getItem(AUTO_BACKUP_LAST_KEY);
}

function markAutoBackup() {
  localStorage.setItem(AUTO_BACKUP_LAST_KEY, new Date().toISOString());
}

function WaterDataSection({ quality, setQuality }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['water-data'],
    queryFn: () => api.get('/api/water-data'),
  });
  const scenes = Array.isArray(data) ? data : [];
  const [busy, setBusy] = useState(false);

  const totalBytes = scenes.reduce((acc, s) => acc + (s.size_bytes || 0), 0);

  const fetchHere = async () => {
    if (!navigator.geolocation) {
      toast.error('GPS auf diesem Geraet nicht verfuegbar');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        await api.post('/api/water-data/fetch', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          quality,
        });
        qc.invalidateQueries({ queryKey: ['water-data'] });
        toast.success('Wasserdaten gecacht');
      } catch (e) {
        toast.error(`Cache fehlgeschlagen: ${e.message}`);
      } finally {
        setBusy(false);
      }
    }, err => {
      setBusy(false);
      toast.error(err.code === err.PERMISSION_DENIED ? 'GPS verweigert' : 'GPS nicht verfuegbar');
    }, { timeout: 10000, enableHighAccuracy: true });
  };

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/water-data/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-data'] });
      toast.success('Geloescht');
    },
    onError: e => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Wasserdaten (3D)</h2>
        </div>
        <span className="text-xs text-gray-400">{scenes.length} Szenen · {formatBytes(totalBytes)}</span>
      </div>

      <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-gray-400" />
          <p className="text-xs uppercase tracking-wider text-gray-400">Quality (Samples pro Szene)</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUALITY_ORDER.map(q => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`rounded-lg px-2 py-2 text-xs font-medium border transition-colors ${
                quality === q
                  ? 'bg-sky-600 border-sky-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div>{QUALITY_LABEL[q]}</div>
              <div className="text-[10px] opacity-70">{QUALITY_SAMPLES[q]} h</div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          Quelle: Open-Meteo Forecast + Marine API. Geschaetzte Groesse pro Szene ca. {QUALITY_SAMPLES[quality] * 200} B.
        </p>
      </div>

      <button
        onClick={fetchHere}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-medium py-2 transition-colors"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {busy ? 'Lade Wasserdaten…' : 'Aktuellen Standort cachen'}
      </button>

      {isLoading ? (
        <p className="text-xs text-gray-500">Lade…</p>
      ) : scenes.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-2">Noch keine Wasserdaten gecacht.</p>
      ) : (
        <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
          {scenes.slice(0, 6).map(s => (
            <li key={s.id} className="p-3 bg-gray-950/60 flex justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {QUALITY_LABEL[s.quality] || s.quality} · {s.sample_count} Samples
                </p>
                <p className="text-xs text-gray-500">
                  {s.latitude.toFixed(3)}, {s.longitude.toFixed(3)} · {formatRelative(s.captured_at)}
                </p>
                <p className="text-[10px] text-gray-600">{formatBytes(s.size_bytes)} · {s.source}</p>
              </div>
              <button onClick={() => del.mutate(s.id)} className="text-gray-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BathymetrySection({ userPos }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['bathymetry-regions'],
    queryFn: () => api.get('/api/bathymetry/regions'),
  });
  const regions = Array.isArray(data) ? data : [];
  const [name, setName] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [compress, setCompress] = useState(true);

  const totalBytes = regions.reduce((acc, r) => acc + (r.map_data?.size_bytes || 0), 0);
  const totalPoints = regions.reduce((acc, r) => acc + (r.map_data?.point_count || 0), 0);

  const create = useMutation({
    mutationFn: (body) => api.post('/api/bathymetry/regions', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bathymetry-regions'] });
      setName('');
      toast.success('Region angelegt');
    },
    onError: e => toast.error(e.message),
  });

  const download = useMutation({
    mutationFn: (id) => api.post(`/api/bathymetry/regions/${id}/download`, { compress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bathymetry-regions'] });
      toast.success('Region heruntergeladen');
    },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/bathymetry/regions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bathymetry-regions'] });
      toast.success('Region geloescht');
    },
    onError: e => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!name.trim()) return toast.error('Name eingeben');
    if (!userPos) return toast.error('GPS-Position erforderlich – bitte auf der Karte „Ich" antippen');
    const [lat, lng] = userPos;
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    create.mutate({
      name: name.trim(),
      bbox: {
        north: lat + dLat,
        south: lat - dLat,
        east: lng + dLng,
        west: lng - dLng,
      },
    });
  };

  return (
    <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Bathymetrie-Regionen</h2>
        </div>
        <span className="text-xs text-gray-400">
          {regions.length} · {totalPoints} Punkte · {formatBytes(totalBytes)}
        </span>
      </div>

      <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800 space-y-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Regionsname (z.B. Mein Hausgewaesser)"
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 flex-shrink-0">Radius</label>
          <input
            type="range"
            min={1}
            max={50}
            value={radiusKm}
            onChange={e => setRadiusKm(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="text-xs text-white w-12 text-right">{radiusKm} km</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={compress}
            onChange={e => setCompress(e.target.checked)}
            className="accent-emerald-500"
          />
          Komprimierte Speicherung (5 Nachkommastellen)
        </label>
        <button
          onClick={handleCreate}
          disabled={create.isPending || !userPos}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium py-2"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Region um aktuellen Standort anlegen
        </button>
        {!userPos && (
          <p className="text-[11px] text-amber-400">Hinweis: Erst in der Karte „Ich" antippen, damit eine Position vorliegt.</p>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-500">Lade…</p>
      ) : regions.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-2">Noch keine Regionen.</p>
      ) : (
        <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
          {regions.map(r => {
            const downloadedAt = r.map_data?.downloaded_at;
            const points = r.map_data?.point_count || 0;
            const size = r.map_data?.size_bytes || 0;
            const bbox = r.map_data?.bbox;
            return (
              <li key={r.id} className="p-3 bg-gray-950/60 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {bbox ? `${bbox.south.toFixed(2)} … ${bbox.north.toFixed(2)} N · ${bbox.west.toFixed(2)} … ${bbox.east.toFixed(2)} O` : 'keine BBox'}
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {points} Punkte · {formatBytes(size)} · {downloadedAt ? `geladen ${formatRelative(downloadedAt)}` : 'noch nicht geladen'}
                    </p>
                  </div>
                  <button onClick={() => del.mutate(r.id)} className="text-gray-500 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <button
                  onClick={() => download.mutate(r.id)}
                  disabled={download.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white text-xs font-medium py-1.5"
                >
                  {download.isPending && download.variables === r.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {downloadedAt ? 'Aktualisieren' : 'Daten laden'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BackupsSection({ online }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get('/api/backups'),
    enabled: online,
  });
  const backups = Array.isArray(data) ? data : [];
  const [autoEnabled, setAutoEnabledLocal] = useState(getAutoBackup());
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');

  const totalBytes = backups.reduce((acc, b) => acc + (b.size_bytes || 0), 0);

  const create = useMutation({
    mutationFn: (kind) => api.post('/api/backups', { kind }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup angelegt');
    },
    onError: e => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: ({ id, mode }) => api.post(`/api/backups/${id}/restore`, { mode }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['catches'] });
      qc.invalidateQueries({ queryKey: ['spots'] });
      qc.invalidateQueries({ queryKey: ['water-data'] });
      setConfirmRestore(null);
      const total = Object.values(res?.results || {}).reduce((a, r) => a + (r.inserted || 0), 0);
      toast.success(`Wiederhergestellt: ${total} Eintraege`);
    },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/backups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup geloescht');
    },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    if (!autoEnabled || !online) return;
    const last = lastAutoBackupAt();
    const lastTs = last ? new Date(last).getTime() : 0;
    if (Date.now() - lastTs < 24 * 60 * 60 * 1000) return;
    create.mutate('auto');
    markAutoBackup();
  }, [autoEnabled, online]);

  const toggleAuto = () => {
    const next = !autoEnabled;
    setAutoBackup(next);
    setAutoEnabledLocal(next);
    toast.success(next ? 'Auto-Backup aktiv (1x pro Tag)' : 'Auto-Backup deaktiviert');
  };

  return (
    <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive size={18} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Backups (Cloud)</h2>
        </div>
        <span className="text-xs text-gray-400">{backups.length} · {formatBytes(totalBytes)}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-950/60 p-3 border border-gray-800">
        <div>
          <p className="text-sm text-white font-medium">Auto-Backup</p>
          <p className="text-xs text-gray-400">Taeglich automatisch sichern</p>
        </div>
        <button
          onClick={toggleAuto}
          className={`relative h-6 w-11 rounded-full transition-colors ${autoEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}
          aria-label="Auto-Backup umschalten"
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <button
        onClick={() => create.mutate('manual')}
        disabled={create.isPending || !online}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-medium py-2"
      >
        {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
        Snapshot jetzt erstellen
      </button>

      {isLoading ? (
        <p className="text-xs text-gray-500">Lade…</p>
      ) : backups.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-2">Noch keine Backups.</p>
      ) : (
        <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
          {backups.slice(0, 8).map(b => (
            <li key={b.id} className="p-3 bg-gray-950/60 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white">{b.kind === 'auto' ? 'Auto' : 'Manuell'} · {formatRelative(b.created_at)}</p>
                  <p className="text-[11px] text-gray-500">
                    {b.catches_count} Faenge · {b.spots_count} Spots · {b.water_scenes_count} Wasserdaten · {b.bathymetric_maps_count} Regionen
                  </p>
                  <p className="text-[11px] text-gray-600">{formatBytes(b.size_bytes)}</p>
                </div>
                <button onClick={() => del.mutate(b.id)} className="text-gray-500 hover:text-red-400 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              {confirmRestore === b.id ? (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRestoreMode('merge')}
                      className={`flex-1 rounded-md py-1 text-[11px] font-medium border ${
                        restoreMode === 'merge' ? 'bg-amber-700 border-amber-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300'
                      }`}
                    >
                      Hinzufuegen
                    </button>
                    <button
                      onClick={() => setRestoreMode('replace')}
                      className={`flex-1 rounded-md py-1 text-[11px] font-medium border ${
                        restoreMode === 'replace' ? 'bg-red-700 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300'
                      }`}
                    >
                      Ersetzen
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => restore.mutate({ id: b.id, mode: restoreMode })}
                      disabled={restore.isPending}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-medium py-1.5"
                    >
                      {restore.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Bestaetigen
                    </button>
                    <button
                      onClick={() => setConfirmRestore(null)}
                      className="flex-1 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-medium py-1.5"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmRestore(b.id); setRestoreMode('merge'); }}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium py-1.5"
                >
                  <RotateCcw size={12} /> Wiederherstellen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BandwidthInsights() {
  const { data: waterData } = useQuery({ queryKey: ['water-data'], queryFn: () => api.get('/api/water-data') });
  const { data: regions } = useQuery({ queryKey: ['bathymetry-regions'], queryFn: () => api.get('/api/bathymetry/regions') });
  const { data: backups } = useQuery({ queryKey: ['backups'], queryFn: () => api.get('/api/backups') });

  const waterBytes = (waterData || []).reduce((a, s) => a + (s.size_bytes || 0), 0);
  const regionBytes = (regions || []).reduce((a, r) => a + (r.map_data?.size_bytes || 0), 0);
  const backupBytes = (backups || []).reduce((a, b) => a + (b.size_bytes || 0), 0);
  const total = waterBytes + regionBytes + backupBytes;

  return (
    <section className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-fuchsia-400" />
        <h2 className="text-sm font-semibold text-white">Cloud-Nutzung</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Wasserdaten</p>
          <p className="text-base font-bold text-white mt-1">{formatBytes(waterBytes)}</p>
        </div>
        <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bathymetry</p>
          <p className="text-base font-bold text-white mt-1">{formatBytes(regionBytes)}</p>
        </div>
        <div className="rounded-xl bg-gray-950/60 p-3 border border-gray-800">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Backups</p>
          <p className="text-base font-bold text-white mt-1">{formatBytes(backupBytes)}</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 text-center">Gesamt: {formatBytes(total)}</p>
    </section>
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
  const [quality, setQualityLocal] = useState(getStoredQuality());
  const [userPos, setUserPos] = useState(null);

  const intervalChoices = useMemo(() => getIntervalChoices(), []);

  const setQuality = (q) => {
    setQualityLocal(q);
    localStorage.setItem(QUALITY_KEY, q);
  };

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    if (!online) {
      toast.error('Offline – Sync nicht moeglich');
      return;
    }
    if (pending.length === 0) {
      const remote = await getRemoteStatus();
      setServerStatus({ ...remote, checking: false });
      if (remote.reachable) toast.success('Alles synchron');
      else toast.error('Server nicht erreichbar');
      return;
    }
    setSyncing(true);
    const result = await syncNow();
    setSyncing(false);
    await refreshAll();
    if (result?.skipped) {
      toast.info('Sync uebersprungen');
      return;
    }
    qc.invalidateQueries({ queryKey: ['catches'] });
    qc.invalidateQueries({ queryKey: ['spots'] });
    qc.invalidateQueries({ queryKey: ['water-data'] });
    if (result.failed === 0) {
      toast.success(`${result.synced} Eintrag/Eintraege synchronisiert`);
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
      toast.warning('Es gibt unsynchronisierte Eintraege. Erneut tippen zum Bestaetigen.');
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
        <StatusPill ok={online} IconOk={Wifi} IconFail={WifiOff} labelOk="Online" labelFail="Offline" />
        <StatusPill
          ok={serverStatus.reachable}
          IconOk={Server}
          IconFail={CloudOff}
          labelOk="Server erreichbar"
          labelFail={serverStatus.checking ? 'Pruefe Server' : 'Server nicht erreichbar'}
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
            className={`relative h-6 w-11 rounded-full transition-colors ${settings.autoEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
            aria-label="Auto-Sync umschalten"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.autoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
            <h2 className="text-sm font-semibold text-white">Wartende Eintraege</h2>
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
              <p className="text-xs text-gray-500 text-center">+ {pending.length - 8} weitere Eintraege</p>
            )}
          </>
        )}
      </section>

      <WaterDataSection quality={quality} setQuality={setQuality} />
      <BathymetrySection userPos={userPos} />
      <BackupsSection online={online} />
      <BandwidthInsights />

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
              confirmingClear ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <Trash2 size={16} /> {confirmingClear ? 'Wirklich leeren?' : 'Warteschlange leeren'}
          </button>
        </div>
      </section>

      <p className="text-[11px] text-gray-500 text-center pt-2">
        Daten werden lokal in IndexedDB gespeichert und an Supabase uebertragen, sobald eine Verbindung besteht.
      </p>
    </div>
  );
}
