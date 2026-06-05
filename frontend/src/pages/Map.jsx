import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Map() {
  const qc = useQueryClient();
  const [userPos, setUserPos] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSpots, setShowSpots] = useState(true);
  const [newSpot, setNewSpot] = useState({ name: '', water_type: 'see', notes: '' });
  const [mapCenter, setMapCenter] = useState(null);

  const { data } = useQuery({ queryKey: ['spots'], queryFn: () => api.get('/api/spots') });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        const pos = { lat: p.coords.latitude, lon: p.coords.longitude };
        setUserPos(pos);
        setMapCenter(pos);
      },
      () => {
        // Fallback: Deutschland-Mitte
        setMapCenter({ lat: 51.1657, lon: 10.4515 });
      }
    );
  }, []);

  const add = useMutation({
    mutationFn: (body) => api.post('/api/spots', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spots'] });
      setShowAdd(false);
      setNewSpot({ name: '', water_type: 'see', notes: '' });
      toast.success('Spot gespeichert!');
    },
    onError: e => toast.error(e.message)
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/spots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots'] }),
    onError: e => toast.error(e.message)
  });

  const spots = data?.spots || [];

  const saveCurrentPos = () => {
    if (!userPos) return toast.error('Kein GPS-Signal');
    if (!newSpot.name) return toast.error('Bitte einen Namen eingeben');
    add.mutate({ ...newSpot, latitude: userPos.lat, longitude: userPos.lon });
  };

  const focusSpot = (spot) => {
    setMapCenter({ lat: spot.latitude, lon: spot.longitude });
  };

  const mapUrl = mapCenter
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lon - 0.05},${mapCenter.lat - 0.05},${mapCenter.lon + 0.05},${mapCenter.lat + 0.05}&layer=mapnik${userPos ? `&marker=${userPos.lat},${userPos.lon}` : ''}`
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Karte */}
      <div className="relative flex-shrink-0" style={{ height: '45vh' }}>
        {mapUrl ? (
          <iframe
            key={mapUrl}
            src={mapUrl}
            title="Angelkarte"
            className="w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Karte wird geladen…</p>
            </div>
          </div>
        )}

        {/* Buttons oben rechts auf der Karte */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium shadow-lg"
          >
            <Plus size={16} /> Spot
          </button>
          {userPos && (
            <button
              onClick={() => setMapCenter({ ...userPos })}
              className="px-3 py-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-cyan-400 text-sm font-medium shadow-lg border border-gray-700"
            >
              📍 Mein Ort
            </button>
          )}
        </div>

        {userPos && (
          <div className="absolute bottom-2 left-2 rounded-lg bg-gray-900/80 px-2 py-1 text-xs text-cyan-400 border border-gray-700">
            GPS: {userPos.lat.toFixed(4)}, {userPos.lon.toFixed(4)}
          </div>
        )}
      </div>

      {/* Spot hinzufügen */}
      {showAdd && (
        <div className="bg-gray-900 border-t border-gray-700 p-4 space-y-3 flex-shrink-0">
          <input value={newSpot.name} onChange={e => setNewSpot(s => ({ ...s, name: e.target.value }))}
            placeholder="Name des Spots"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm" />
          <div className="flex gap-2">
            <select value={newSpot.water_type} onChange={e => setNewSpot(s => ({ ...s, water_type: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm">
              <option value="see">See</option>
              <option value="fluss">Fluss</option>
              <option value="teich">Teich</option>
              <option value="kanal">Kanal</option>
              <option value="bach">Bach</option>
            </select>
            <button onClick={saveCurrentPos} disabled={!newSpot.name || add.isPending || !userPos}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50">
              {add.isPending ? '…' : 'Speichern'}
            </button>
          </div>
          {!userPos && <p className="text-xs text-yellow-500">Kein GPS-Signal – bitte GPS erlauben</p>}
        </div>
      )}

      {/* Spot-Liste */}
      <div className="flex-1 overflow-auto">
        <button
          onClick={() => setShowSpots(!showSpots)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800 text-sm font-semibold text-white"
        >
          <span>Meine Spots ({spots.length})</span>
          {showSpots ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {showSpots && (
          <div className="space-y-2 px-4 pb-4 pt-2">
            {spots.map(s => (
              <div key={s.id}
                className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 cursor-pointer hover:border-cyan-800 transition-colors"
                onClick={() => s.latitude && focusSpot(s)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <MapPin className="text-cyan-400 shrink-0" size={16} />
                    <div>
                      <p className="font-semibold text-white text-sm">{s.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{s.water_type}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); del.mutate(s.id); }}
                    className="text-gray-600 hover:text-red-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                {s.notes && <p className="text-gray-500 text-xs mt-2 ml-6">{s.notes}</p>}
              </div>
            ))}
            {spots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-3xl mb-3">🗺️</p>
                <p className="text-sm">Noch keine Spots gespeichert</p>
                <p className="text-xs mt-1">Klicke auf "+ Spot", um deinen ersten Spot zu speichern</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
