import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Map() {
  const qc = useQueryClient();
  const [userPos, setUserPos] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSpot, setNewSpot] = useState({ name: '', water_type: 'see', notes: '' });

  const { data } = useQuery({ queryKey: ['spots'], queryFn: () => api.get('/api/spots') });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setUserPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {}
    );
  }, []);

  const add = useMutation({
    mutationFn: (body) => api.post('/api/spots', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spots'] }); setShowAdd(false); toast.success('Spot gespeichert!'); },
    onError: e => toast.error(e.message)
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/spots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots'] })
  });

  const spots = data?.spots || [];

  const saveCurrentPos = () => {
    if (!userPos) return toast.error('Kein GPS-Signal');
    add.mutate({ ...newSpot, latitude: userPos.lat, longitude: userPos.lon });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Angelplätze ({spots.length})</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium">
          <Plus size={16} /> Spot hinzufügen
        </button>
      </div>

      {userPos && (
        <div className="rounded-xl bg-blue-900/20 border border-blue-800/30 p-3 text-sm text-blue-300">
          📍 GPS aktiv: {userPos.lat.toFixed(5)}, {userPos.lon.toFixed(5)}
        </div>
      )}

      {showAdd && (
        <div className="rounded-2xl bg-gray-900 border border-gray-700 p-4 space-y-3">
          <input value={newSpot.name} onChange={e => setNewSpot(s => ({ ...s, name: e.target.value }))}
            placeholder="Name des Spots"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500" />
          <select value={newSpot.water_type} onChange={e => setNewSpot(s => ({ ...s, water_type: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
            <option value="see">See</option>
            <option value="fluss">Fluss</option>
            <option value="teich">Teich</option>
            <option value="kanal">Kanal</option>
            <option value="bach">Bach</option>
          </select>
          <textarea value={newSpot.notes} onChange={e => setNewSpot(s => ({ ...s, notes: e.target.value }))}
            placeholder="Notizen" rows={2}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 resize-none" />
          <button onClick={saveCurrentPos} disabled={!newSpot.name || add.isPending}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50">
            Aktuellen Standort speichern
          </button>
        </div>
      )}

      <div className="space-y-3">
        {spots.map(s => (
          <div key={s.id} className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <MapPin className="text-cyan-400 shrink-0" size={16} />
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-gray-500 text-xs capitalize">{s.water_type}</p>
                  {s.latitude && (
                    <a href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer"
                      className="text-cyan-400 text-xs hover:underline">
                      In Google Maps öffnen
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => del.mutate(s.id)} className="text-gray-600 hover:text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
            {s.notes && <p className="text-gray-500 text-xs mt-2 ml-6">{s.notes}</p>}
          </div>
        ))}
        {spots.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-4">🗺️</p>
            <p>Noch keine Spots gespeichert</p>
            <p className="text-xs mt-2">Gehe angeln und speichere deinen ersten Spot!</p>
          </div>
        )}
      </div>
    </div>
  );
}
