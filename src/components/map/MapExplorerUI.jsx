import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CloudSun, Fish, MapPin, Navigation, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useFishingConditions } from '@/hooks/useFishingConditions';
import { formatForecastTime } from '@/lib/fishingConditions';
import { timeoutSignal, anySignal } from '@/lib/abortCompat';
import { Spot } from '@/entities/Spot';
import { toast } from 'sonner';

export function spotSpecies(spot) {
  return Array.isArray(spot.target_species) ? spot.target_species : Array.isArray(spot.fische) ? spot.fische : [];
}
export function matchesSpecies(spot, species) {
  return !species || spotSpecies(spot).some(name => String(name).toLocaleLowerCase('de').includes(species.toLocaleLowerCase('de')));
}
export function spotCoordinates(spot) {
  const lat = Number(spot?.latitude ?? spot?.coordinates?.lat);
  const lon = Number(spot?.longitude ?? spot?.coordinates?.lng);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

export function MapSearch({ spots, onSelect, onPlace, onSettings, settingsOpen, species, onSpecies }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  const matches = query.trim().length >= 2 ? spots.filter(spot => `${spot.name || ''} ${spot.water_type || ''}`.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))).slice(0, 6) : [];
  const search = async event => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setOpen(true);
    setStatus('Orte werden gesucht …');
    try {
      const params = new URLSearchParams({ name: query.trim(), count: '5', language: 'de', format: 'json' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal: anySignal([controller.signal, timeoutSignal(10000)]) });
      if (!response.ok) throw new Error('search');
      const data = await response.json();
      if (controller.signal.aborted) return;
      setPlaces(data.results || []);
      setStatus(data.results?.length ? '' : 'Keine weiteren Orte gefunden.');
    } catch {
      if (!controller.signal.aborted) setStatus('Ortssuche nicht verfügbar. Deine geladenen Spots bleiben durchsuchbar.');
    }
  };
  return <div className="bb-map-search-area">
    <div className="bb-map-search-row">
      <form onSubmit={search} role="search" className="bb-map-search">
        <button type="submit" aria-label="Ort suchen"><Search size={21} /></button>
        <input aria-label="Gewässer oder Ort suchen" placeholder="Gewässer oder Ort suchen" value={query} onFocus={() => setOpen(true)} onChange={e => { request.current?.abort(); setQuery(e.target.value); setPlaces([]); setStatus(''); setOpen(true); }} />
        {query && <button type="button" aria-label="Suche löschen" onClick={() => { request.current?.abort(); setQuery(''); setPlaces([]); setStatus(''); setOpen(false); }}><X size={18} /></button>}
      </form>
      <button type="button" className="bb-map-control" aria-label="Kartenoptionen" aria-expanded={settingsOpen} onClick={onSettings}><SlidersHorizontal size={22} /></button>
    </div>
    {open && query.trim().length >= 2 && <div className="bb-map-results">
      <div className="flex justify-between items-center"><small>Spots & Orte</small><button type="button" aria-label="Suchergebnisse schließen" onClick={() => setOpen(false)}><X size={18} /></button></div>
      {matches.map(spot => <button type="button" key={spot.id} onClick={() => { onSelect(spot); setOpen(false); }}><MapPin size={18} /><span>{spot.name}<small>{spot.water_type || 'Angelort'}</small></span></button>)}
      {places.map(place => <button type="button" key={place.id} onClick={() => { onPlace([place.latitude, place.longitude]); setOpen(false); }}><Search size={18} /><span>{place.name}<small>{[place.admin1, place.country].filter(Boolean).join(', ')}</small></span></button>)}
      <p role="status">{status || (!matches.length && !places.length ? 'Keine passenden Spots. Mit der Lupe nach einem Ort suchen.' : '')}</p>
      <small>Ortssuche: Open-Meteo / GeoNames</small>
    </div>}
    <div className="bb-map-filters" aria-label="Nach Fischart filtern">
      {['', 'Hecht', 'Zander', 'Barsch'].map(name => <button type="button" key={name} aria-pressed={species === name} onClick={() => onSpecies(name)}>{name ? <Fish size={18} /> : <MapPin size={18} />}{name || 'Alle Spots'}</button>)}
    </div>
  </div>;
}

export function MapWeather({ lat, lon }) {
  const conditions = useFishingConditions(lat, lon);
  const current = conditions.data?.current;
  if (!current || !Number.isFinite(current.temperature_2m)) return null;
  return <Link className="bb-map-weather" to="/Weather"><CloudSun size={20} /><strong>{Math.round(current.temperature_2m)}°</strong>{Number.isFinite(current.wind_speed_10m) && <span>Wind {Math.round(current.wind_speed_10m)} km/h</span>}</Link>;
}

export function MapSpotPreview({ spot, ownLocation, onDetails, onClose, onUpdate }) {
  const coords = spotCoordinates(spot);
  const conditions = useFishingConditions(coords?.lat, coords?.lon);
  const [favorite, setFavorite] = useState(Boolean(spot.is_favorite));
  const [saving, setSaving] = useState(false);
  useEffect(() => setFavorite(Boolean(spot.is_favorite)), [spot.is_favorite]);
  const species = spotSpecies(spot);
  let distance = null;
  if (coords && ownLocation) {
    const radians = n => n * Math.PI / 180;
    const rawA = Math.sin(radians(coords.lat - ownLocation.lat) / 2) ** 2 + Math.cos(radians(ownLocation.lat)) * Math.cos(radians(coords.lat)) * Math.sin(radians(coords.lon - ownLocation.lon) / 2) ** 2;
    const a = Math.min(1, Math.max(0, rawA));
    const meters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    if (Number.isFinite(meters)) distance = meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`;
  }
  const toggleFavorite = async () => {
    setSaving(true);
    try { await Spot.update(spot.id, { is_favorite: !favorite }); setFavorite(!favorite); onUpdate(); }
    catch { toast.error('Favorit konnte nicht gespeichert werden'); }
    finally { setSaving(false); }
  };
  return <section className="bb-map-preview" aria-label="Ausgewählter Spot">
    <div className="bb-map-handle" aria-hidden="true" />
    <div className="bb-map-preview-heading"><span><MapPin size={14} /> AUSGEWÄHLTER SPOT</span><button type="button" aria-label="Spotauswahl schließen" onClick={onClose}><X size={18} /></button></div>
    <div className="flex items-center justify-between gap-3"><h2>{spot.name}</h2>{spot.type === 'spot' && <button type="button" className="bb-map-control" aria-label="Spot merken" aria-pressed={favorite} disabled={saving} onClick={toggleFavorite}><Bookmark size={23} fill={favorite ? 'currentColor' : 'none'} /></button>}</div>
    <p className="bb-map-meta">{[distance && `${distance} Luftlinie`, species.join(' & ') || spot.water_type || (spot.category === 'club' ? 'Angelverein' : 'Angelort')].filter(Boolean).join(' · ')}</p>
    {conditions.window && <div className="bb-map-insight"><Sparkles size={22} /><div><strong>Dein nächstes Zeitfenster</strong><p>{formatForecastTime(conditions.window.start, conditions.data?.timezone, true)} – {formatForecastTime(conditions.window.end, conditions.data?.timezone)} Uhr</p><small>Wetterbasierte Einschätzung · keine Fanggarantie</small></div></div>}
    <div className="bb-map-preview-actions">{coords && <a href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`} target="_blank" rel="noopener noreferrer"><Navigation size={19} />Route starten</a>}<button type="button" onClick={onDetails}>Details</button></div>
  </section>;
}
