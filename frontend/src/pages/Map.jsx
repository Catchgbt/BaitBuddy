import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

// Farbige Marker-Icons
const makeIcon = (bg, label) => L.divIcon({
  html: `<div style="background:${bg};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:15px">${label}</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: '',
});

const GPS_ICON   = makeIcon('#ef4444', '📍'); // Rot – aktueller Standort
const SPOT_ICON  = makeIcon('#3b82f6', '🎣'); // Blau – eigene Spots
const NEW_ICON   = makeIcon('#f97316', '➕'); // Orange – neuer Spot

function AddSpotMarker({ onAdd }) {
  useMapEvents({
    click(e) { onAdd(e.latlng); },
  });
  return null;
}

export default function Map() {
  const qc = useQueryClient();
  const [userPos, setUserPos] = useState(null);
  const [pendingPos, setPendingPos] = useState(null); // orange marker
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newSpot, setNewSpot] = useState({ name: '', water_type: 'see', notes: '' });
  const mapRef = useRef();

  const { data } = useQuery({ queryKey: ['spots'], queryFn: () => api.get('/api/spots') });
  const spots = data?.spots || [];

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        mapRef.current?.flyTo(pos, 13);
      },
      () => {}
    );
  }, []);

  const add = useMutation({
    mutationFn: (body) => api.post('/api/spots', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spots'] });
      setShowForm(false);
      setPendingPos(null);
      setAddMode(false);
      setNewSpot({ name: '', water_type: 'see', notes: '' });
      toast.success('Spot gespeichert!');
    },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/spots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spots'] }),
    onError: e => toast.error(e.message),
  });

  const handleMapClick = (latlng) => {
    if (!addMode) return;
    setPendingPos([latlng.lat, latlng.lng]);
    setShowForm(true);
  };

  const saveSpot = () => {
    if (!newSpot.name) return toast.error('Bitte einen Namen eingeben');
    const [latitude, longitude] = pendingPos || userPos || [0, 0];
    add.mutate({ ...newSpot, latitude, longitude });
  };

  const defaultCenter = userPos || [51.1657, 10.4515];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Karte */}
      <div className="relative flex-1">
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 13 : 6}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {addMode && <AddSpotMarker onAdd={handleMapClick} />}

          {/* GPS-Position (rot) */}
          {userPos && (
            <Marker position={userPos} icon={GPS_ICON}>
              <Popup><b>Mein Standort</b></Popup>
            </Marker>
          )}

          {/* Eigene Spots (blau) */}
          {spots.map(s => s.latitude && (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={SPOT_ICON}>
              <Popup>
                <div style={{ minWidth: 120 }}>
                  <b>{s.name}</b><br />
                  <span style={{ color: '#888', fontSize: 12 }}>{s.water_type}</span>
                  {s.notes && <><br /><span style={{ fontSize: 12 }}>{s.notes}</span></>}
                  <br />
                  <button
                    onClick={() => del.mutate(s.id)}
                    style={{ marginTop: 6, color: '#f87171', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    🗑 Löschen
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Neuer Spot (orange) */}
          {pendingPos && (
            <Marker position={pendingPos} icon={NEW_ICON}>
              <Popup>Neuer Spot hier</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Buttons oben rechts */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => { setAddMode(!addMode); if (addMode) { setPendingPos(null); setShowForm(false); } }}
            className={`px-3 py-2 rounded-xl text-white text-sm font-medium shadow-lg border transition-all ${
              addMode ? 'bg-orange-500 border-orange-400' : 'bg-cyan-600 border-cyan-500'
            }`}
          >
            {addMode ? '✕ Abbrechen' : '＋ Spot'}
          </button>
          {userPos && (
            <button
              onClick={() => mapRef.current?.flyTo(userPos, 14)}
              className="px-3 py-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-cyan-400 text-sm font-medium shadow-lg border border-gray-700"
            >
              📍 Ich
            </button>
          )}
        </div>

        {addMode && !showForm && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/95 text-white text-sm px-4 py-2 rounded-xl border border-orange-500 shadow-lg">
            Auf Karte tippen, um Spot zu setzen
          </div>
        )}
      </div>

      {/* Spot-Formular */}
      {showForm && (
        <div className="bg-gray-900 border-t border-gray-700 p-4 space-y-3 flex-shrink-0">
          <div className="flex justify-between items-center">
            <p className="text-white font-semibold text-sm">Spot benennen</p>
            <button onClick={() => { setShowForm(false); setPendingPos(null); }} className="text-gray-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <input
            value={newSpot.name}
            onChange={e => setNewSpot(s => ({ ...s, name: e.target.value }))}
            placeholder="Name des Spots"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newSpot.water_type}
              onChange={e => setNewSpot(s => ({ ...s, water_type: e.target.value }))}
              className="flex-1 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm"
            >
              <option value="see">See</option>
              <option value="fluss">Fluss</option>
              <option value="teich">Teich</option>
              <option value="kanal">Kanal</option>
              <option value="bach">Bach</option>
            </select>
            <button
              onClick={saveSpot}
              disabled={!newSpot.name || add.isPending}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50"
            >
              {add.isPending ? '…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Spots-Liste kompakt */}
      {spots.length > 0 && !showForm && (
        <div className="flex-shrink-0 border-t border-gray-800 bg-gray-950 max-h-36 overflow-auto">
          {spots.map(s => (
            <div key={s.id}
              onClick={() => s.latitude && mapRef.current?.flyTo([s.latitude, s.longitude], 15)}
              className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/50 cursor-pointer hover:bg-gray-900/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎣</span>
                <div>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  <p className="text-gray-500 text-xs capitalize">{s.water_type}</p>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); del.mutate(s.id); }}
                className="text-gray-600 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
