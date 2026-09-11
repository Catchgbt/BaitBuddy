import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { entities } from '@/api/frontendClient';
import { MapPin, ArrowLeft, ArrowRight, Check, X, Navigation, Download } from 'lucide-react';
import { readTripForm, tripPayload, suggestedPacking, tripCalendar } from '@/lib/tripPlanning';
import { useFishingConditions } from '@/hooks/useFishingConditions';
import { bestWindow, formatForecastTime, weatherDescription } from '@/lib/fishingConditions';
import BuddyCard from '@/components/buddy/BuddyCard';
import SolunarService from '@/services/SolunarService';
import { useBuddyPreferences } from '@/lib/BuddyPreferencesContext';
const STEPS = ['Ort', 'Wann', 'Ausrüstung', 'Details'];
const METHODS = ['Spinnfischen', 'Grundangeln', 'Feederangeln', 'Posenangeln', 'Karpfenangeln', 'Fliegenfischen', 'Vertikalangeln', 'Brandungsangeln', 'Eisangeln', 'Sonstiges'];
function Field({ label, children }) { return <label className="bb-settings-field">{label}{children}</label>; }
export default function TripForm({ onClose, onSave, plan, currentLocation }) {
  const { userId, canSave } = useBuddyPreferences();
  const [form, setForm] = useState(() => readTripForm(plan));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedPayload, setSavedPayload] = useState(null);
  const [spotFilter, setSpotFilter] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const spots = useQuery({ queryKey: ['planner-spots-v2', userId], enabled: canSave, queryFn: () => entities.Spot.list(), staleTime: 60000 });
  const gear = useQuery({ queryKey: ['planner-gear-v2', userId], enabled: canSave, queryFn: () => entities.GearItem.list(), staleTime: 60000 });
  const conditions = useFishingConditions(form.lat === '' ? null : form.lat, form.lon === '' ? null : form.lon);
  useEffect(() => { setForm(readTripForm(plan)); setStep(0); setSavedPayload(null); }, [plan]);
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const input = (key, label, type = 'text', props = {}) => <Field label={label}><input type={type} value={form[key]} onChange={e => set(key, e.target.value)} {...props}/></Field>;
  const selectSpot = spot => setForm(previous => ({ ...previous, spotName: spot.name || '', waterType: spot.water_type || '', lat: spot.latitude ?? '', lon: spot.longitude ?? '' }));
  const availableSpots = (Array.isArray(spots.data) ? spots.data : []).filter(spot => (!onlyFavorites || spot.is_favorite || spot.favorite) && (!spotFilter || spot.name?.toLowerCase().includes(spotFilter.toLowerCase())));
  const items = Array.isArray(gear.data) ? gear.data : [];
  const packing = [...new Set([...suggestedPacking(form), ...form.checklist.split('\n').map(item => item.trim()).filter(Boolean), ...items.filter(item => form.selectedGear.includes(item.id)).map(item => item.name)])];
  const selectedDayHours = conditions.hours.filter(row => {
    const d = new Date(row.time);
    return !form.date || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === form.date;
  });
  const recommendation = bestWindow(selectedDayHours, Date.now());
  const timezone = conditions.data?.timezone;
  const moon = SolunarService.getMoonPhaseName(SolunarService.getMoonPhase(form.date ? new Date(`${form.date}T12:00`) : new Date()));
  const setRecommendedTime = () => {
    if (!recommendation) return;
    const recommended = readTripForm({ planned_date: new Date(recommendation.start).toISOString() });
    setForm(previous => ({ ...previous, date: recommended.date, time: recommended.time, durationHours: 2 }));
  };
  const next = () => {
    setError('');
    if (step === 0 && !form.spotName.trim()) { setError('Wähle ein Gewässer oder gib einen Spotnamen ein.'); return; }
    if (step === 3) { try { tripPayload(form, plan); } catch (err) { setError(err.message); return; } }
    setStep(previous => Math.min(4, previous + 1));
  };
  const save = async () => {
    setError(''); setSaving(true);
    try {
      const payload = tripPayload({ ...form, checklist: packing.join('\n') }, plan);
      await onSave(payload, plan?.id);
      setSavedPayload(payload);
    } catch (err) { setError(err.message || 'Der Ausflug konnte nicht gespeichert werden. Bitte erneut versuchen.'); }
    finally { setSaving(false); }
  };
  const downloadCalendar = () => {
    try {
      const blob = new Blob([tripCalendar(savedPayload)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'BaitBuddy-Ausflug.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  };
  if (savedPayload) return <section className="bb-app bb-card space-y-5" aria-live="polite"><Check className="text-emerald-300" size={32}/><h2 className="text-2xl font-semibold">Dein Ausflug ist gespeichert.</h2><p className="bb-muted">{savedPayload.title} · {savedPayload.spot_info.name}</p><div className="flex flex-wrap gap-3">
    {savedPayload.spot_info.lat != null && <a className="bb-action" href={`https://www.google.com/maps/dir/?api=1&destination=${savedPayload.spot_info.lat},${savedPayload.spot_info.lon}`} target="_blank" rel="noopener noreferrer"><Navigation size={18}/>Navigation starten</a>}
    {savedPayload.planned_date && <button type="button" className="bb-secondary" onClick={downloadCalendar}><Download size={18}/>In Kalender übernehmen</button>}
    <button type="button" className="bb-secondary" onClick={onClose}>Zu meinen Trips</button></div>{error && <p role="alert">{error}</p>}</section>;
  const start = form.date ? new Date(`${form.date}T${form.time || '06:00'}`) : null;
  const end = start ? new Date(start.getTime() + Number(form.durationHours || 3) * 3600000) : null;
  return <section className="bb-app bb-card space-y-6">
    <header className="flex justify-between items-start gap-3"><div><p className="bb-eyebrow mb-2">Dein nächstes Abenteuer</p><h2 className="text-2xl font-semibold">{plan ? 'Ausflug bearbeiten' : 'Ausflug planen'}</h2></div><button type="button" onClick={onClose} className="bb-secondary" aria-label="Planung schließen"><X size={20}/></button></header>
    <ol className="grid grid-cols-4 gap-2" aria-label="Planungsfortschritt">{STEPS.map((label, index) => <li key={label} className="min-w-0"><button type="button" disabled={index > step} onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} className={`w-full min-h-12 text-xs rounded-xl flex flex-col items-center gap-1 py-2 ${index <= step ? 'text-cyan-200 bg-cyan-400/10' : 'text-slate-500 bg-white/5'}`}><span>{index + 1}</span>{label}</button></li>)}</ol>
    {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
    {step === 0 && <div className="space-y-5"><h3 className="text-lg font-semibold">Wo geht es hin?</h3><div className="grid gap-3"><Field label="Gespeicherte Spots durchsuchen"><input type="search" value={spotFilter} onChange={e => setSpotFilter(e.target.value)}/></Field><label className="bb-secondary"><input type="checkbox" checked={onlyFavorites} onChange={e => setOnlyFavorites(e.target.checked)} className="accent-cyan-400"/>Nur Favoriten</label></div>
      {spots.isError ? <button type="button" onClick={() => spots.refetch()} className="bb-secondary">Spots erneut laden</button> : spots.isLoading ? <p role="status" className="bb-muted">Spots werden geladen …</p> : availableSpots.length ? <div className="grid gap-2 max-h-64 overflow-y-auto">{availableSpots.map(spot => <button type="button" key={spot.id} onClick={() => selectSpot(spot)} className="bb-secondary text-left"><MapPin size={18}/><span className="flex-1">{spot.name}<span className="block text-xs text-slate-400">{spot.water_type}</span></span>{form.spotName === spot.name && <Check size={18}/>}</button>)}</div> : <p className="bb-muted">Keine passenden gespeicherten Spots. Du kannst dein Gewässer unten selbst eintragen.</p>}
      {input('spotName', 'Gewässer / Spotname')}
      {input('waterType', 'Gewässertyp')}
      <div className="grid grid-cols-2 gap-3">{input('lat', 'Breitengrad', 'number', { min:-90,max:90,step:'any' })}{input('lon', 'Längengrad', 'number', { min:-180,max:180,step:'any' })}</div>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={currentLocation?.lat == null} onClick={() => setForm(previous => ({ ...previous, lat:currentLocation.lat,lon:currentLocation.lon }))} className="bb-secondary disabled:opacity-40">Aktuellen Standort nutzen</button><Link className="bb-secondary" to="/Map" target="_blank" rel="noopener noreferrer">Karte öffnen</Link></div>
      <BuddyCard message="Wähle zuerst dein Gewässer. Dann können wir das Wetter für genau diesen Ort ansehen." question={`Was sollte ich an meinem Spot ${form.spotName || 'in meiner Nähe'} beachten?`}/>
    </div>}
    {step === 1 && <div className="space-y-5"><h3 className="text-lg font-semibold">Wann passt es am besten?</h3>{input('date', 'Datum', 'date')}<div className="grid grid-cols-2 gap-3">{input('time', 'Startzeit', 'time')}{input('durationHours', 'Dauer in Stunden', 'number', { min:.5,max:168,step:.5 })}</div>
      {end && Number.isFinite(end.getTime()) && <p className="bb-muted">Ende: {end.toLocaleString('de-DE')}</p>}
      {!conditions.hasLocation && <p className="bb-muted">Ergänze die Koordinaten deines Spots für die lokale Prognose.</p>}
      {conditions.isLoading && <p className="bb-muted" role="status">Wetterfenster werden geladen …</p>}
      {conditions.isError && <button type="button" className="bb-secondary" onClick={() => conditions.refetch()}>Wetter erneut laden</button>}
      {recommendation ? <div className="rounded-2xl p-5 bg-cyan-400/10 space-y-3"><p className="bb-eyebrow">Günstigstes Wetterfenster</p><p className="text-xl font-semibold">{formatForecastTime(recommendation.start, timezone, true)} – {formatForecastTime(recommendation.end, timezone)}</p><p className="bb-muted">Biss-Index {recommendation.index}/100 · Modellwert</p><button type="button" className="bb-secondary" onClick={setRecommendedTime}>Zeitfenster übernehmen</button></div> : conditions.data && <p className="bb-muted">Für diesen Zeitraum ist kein geeignetes Wetterfenster verfügbar. Du kannst die Zeit selbst festlegen.</p>}
      <p className="bb-muted">Mondphase: {moon}. Die Wetterprognose reicht bis zu sieben Tage. Der Modellwert ist keine Fangwahrscheinlichkeit.</p>
    </div>}
    {step === 2 && <div className="space-y-5"><h3 className="text-lg font-semibold">Alles dabei?</h3><p className="bb-muted">Wähle deine Ausrüstung und hake ab, was bereits eingepackt ist.</p>
      {gear.isError ? <button type="button" className="bb-secondary" onClick={() => gear.refetch()}>Ausrüstung erneut laden</button> : items.length ? <fieldset className="space-y-2"><legend className="text-sm font-semibold mb-3">Meine Ausrüstung</legend>{items.map(item => <label key={item.id} className="bb-secondary w-full"><input type="checkbox" className="accent-cyan-400" checked={form.selectedGear.includes(item.id)} onChange={e => set('selectedGear', e.target.checked ? [...form.selectedGear,item.id] : form.selectedGear.filter(id => id !== item.id))}/>{item.name}</label>)}</fieldset> : <Link className="bb-secondary" to="/Gear" target="_blank" rel="noopener noreferrer">Ausrüstung hinzufügen</Link>}
      <fieldset className="grid sm:grid-cols-2 gap-2"><legend className="text-sm font-semibold mb-3">Empfohlene Packliste</legend>{packing.map(item => <label key={item} className="bb-secondary"><input type="checkbox" className="accent-cyan-400" checked={form.packed.includes(item)} onChange={e => set('packed', e.target.checked ? [...form.packed,item] : form.packed.filter(value => value !== item))}/>{item}</label>)}</fieldset>
      <Field label="Eigene Checkliste (ein Gegenstand pro Zeile)"><textarea rows={3} value={form.checklist} onChange={e => set('checklist',e.target.value)}/></Field>
      {input('bait', 'Köder')}<Field label="Weitere Ausrüstungsdetails"><textarea rows={3} value={form.gear} onChange={e => set('gear',e.target.value)}/></Field>
    </div>}
    {step === 3 && <div className="space-y-5"><h3 className="text-lg font-semibold">Mach den Ausflug zu deinem.</h3>{input('title', 'Titel der Tour *')}{input('target_fish','Zielfisch')}<Field label="Angelmethode"><select value={form.method} onChange={e => set('method',e.target.value)}><option value="">Methode wählen</option>{METHODS.map(method => <option key={method}>{method}</option>)}</select></Field>{input('companions','Teilnehmer')}
      <Field label="Notizen"><textarea rows={4} value={form.notes} onChange={e => set('notes',e.target.value)}/></Field><Field label="Kalender-Erinnerung"><select value={form.reminder} onChange={e => set('reminder',Number(e.target.value))}><option value={0}>Keine</option><option value={15}>15 Minuten vorher</option><option value={60}>1 Stunde vorher</option><option value={1440}>1 Tag vorher</option></select><span className="text-xs text-slate-400">Nach dem Speichern den Ausflug in deinen Kalender übernehmen, damit die Erinnerung aktiviert wird.</span></Field>
    </div>}
    {step === 4 && <div className="space-y-5"><h3 className="text-2xl font-semibold">Dein Angelausflug</h3><dl className="grid grid-cols-2 gap-5">{[['Titel',form.title],['Ort',form.spotName],['Zielfisch',form.target_fish || 'Noch offen'],['Methode',form.method || 'Noch offen'],['Start',start?.toLocaleString('de-DE') || 'Noch offen'],['Ende',end?.toLocaleString('de-DE') || 'Noch offen'],['Teilnehmer',form.companions || 'Alleine'],['Ausrüstung',`${packing.filter(item => form.packed.includes(item)).length}/${packing.length} eingepackt`]].map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-400 mb-1">{label}</dt><dd className="text-sm font-medium break-words">{value}</dd></div>)}</dl><BuddyCard message={`${packing.filter(item => !form.packed.includes(item)).length} Punkte deiner Packliste sind noch offen. Prüfe deine Vorbereitung, bevor es losgeht.`} question={`Prüfe meine Vorbereitung: Zielfisch ${form.target_fish}, Spot ${form.spotName}, Methode ${form.method}, Ausrüstung ${form.gear}.`}/></div>}
    <footer className="flex gap-3 justify-between pt-3 border-t border-white/5"><button type="button" className="bb-secondary" onClick={() => step ? setStep(step - 1) : onClose()} disabled={saving}><ArrowLeft size={17}/>{step ? 'Zurück' : 'Abbrechen'}</button>{step < 4 ? <button type="button" className="bb-action" onClick={next}>{step === 3 ? 'Zusammenfassung' : 'Weiter'}<ArrowRight size={17}/></button> : <button type="button" className="bb-action" disabled={saving} onClick={save}>{saving ? 'Wird gespeichert …' : 'Trip speichern'}<Check size={17}/></button>}</footer>
  </section>;
}
