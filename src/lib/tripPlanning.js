export function readTripForm(plan) {
  const details = plan?.details && typeof plan.details === 'object' ? plan.details : {};
  const spot = plan?.spot_info && typeof plan.spot_info === 'object' ? plan.spot_info : { name: String(plan?.spot_info || '').split('\n')[0] };
  const legacyCoords = typeof plan?.spot_info === 'string' ? plan.spot_info.match(/Koordinaten:\s*([\d.\-]+),\s*([\d.\-]+)/) : null;
  const start = plan?.planned_date ? new Date(plan.planned_date) : null;
  const pad = n => String(n).padStart(2, '0');
  const validStart = start && Number.isFinite(start.getTime());
  return { title: plan?.title || '', target_fish: plan?.target_fish || '', spotName: spot.name || '', waterType: spot.water_type || '', lat: spot.lat ?? legacyCoords?.[1] ?? '', lon: spot.lon ?? legacyCoords?.[2] ?? '',
    date: validStart ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : '', time: validStart ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '06:00',
    durationHours: details.duration_hours ?? 3, method: details.method || '', bait: details.bait || '', gear: details.gear || '', companions: details.companions || '', notes: details.notes || '',
    checklist: Array.isArray(plan?.steps) ? plan.steps.join('\n') : '', packed: Array.isArray(details.packed_items) ? details.packed_items : [], selectedGear: Array.isArray(details.gear_ids) ? details.gear_ids : [], reminder: details.reminder_minutes ?? 0 };
}
export function tripPayload(form, plan) {
  const lat = form.lat === '' ? null : Number(form.lat), lon = form.lon === '' ? null : Number(form.lon);
  if ((lat == null) !== (lon == null) || (lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180))) throw new Error('Bitte gültige Koordinaten für Breiten- und Längengrad eingeben.');
  const start = form.date ? new Date(`${form.date}T${form.time || '06:00'}`) : null;
  if (start && !Number.isFinite(start.getTime())) throw new Error('Bitte Datum und Uhrzeit prüfen.');
  const duration = form.durationHours === '' ? null : Number(form.durationHours);
  if (duration != null && (!Number.isFinite(duration) || duration <= 0 || duration > 168)) throw new Error('Die Dauer muss zwischen 0 und 168 Stunden liegen.');
  if (!form.title.trim()) throw new Error('Bitte gib deinem Ausflug einen Namen.');
  return { title: form.title.trim(), target_fish: form.target_fish.trim(), planned_date: start?.toISOString() || null,
    spot_info: { ...(typeof plan?.spot_info === 'object' ? plan.spot_info : {}), name: form.spotName.trim(), water_type: form.waterType, lat, lon },
    steps: [...new Set(form.checklist.split('\n').map(value => value.trim()).filter(Boolean))],
    details: { ...(plan?.details || {}), method: form.method, bait: form.bait.trim(), gear: form.gear.trim(), companions: form.companions.trim(), notes: form.notes.trim(), duration_hours: duration, packed_items: form.packed, gear_ids: form.selectedGear, reminder_minutes: Number(form.reminder) || 0 } };
}
export function suggestedPacking({ target_fish = '', time = '', method = '' }) {
  const items = ['Angelschein & Erlaubnis', 'Rute', 'Rolle', 'Schnur', 'Vorfach', 'Köder', 'Haken', 'Kescher', 'Zange', 'Abhakmatte', 'Wettergerechte Kleidung'];
  if (/hecht/i.test(target_fish)) items.push('Hechtsicheres Vorfach');
  if (/spinn|vertikal/i.test(method)) items.push('Ersatzköder');
  const hour = Number(time.split(':')[0]);
  if (Number.isFinite(hour) && (hour < 7 || hour >= 18)) items.push('Stirnlampe');
  return items;
}
export function tripCalendar(payload) {
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const stamp = date => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const start = new Date(payload.planned_date);
  if (!Number.isFinite(start.getTime())) throw new Error('Für den Kalender bitte ein Datum wählen.');
  const end = new Date(start.getTime() + (payload.details.duration_hours || 3) * 3600000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BaitBuddy//Trip Planner//DE', 'BEGIN:VEVENT', `UID:bb-${start.getTime()}-${encodeURIComponent(payload.title)}@baitbuddy`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(payload.title)}`, `LOCATION:${escape(payload.spot_info.name)}`, `DESCRIPTION:${escape(payload.details.notes)}`, ...(payload.details.reminder_minutes ? ['BEGIN:VALARM', `TRIGGER:-PT${payload.details.reminder_minutes}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Dein Angelausflug beginnt bald.', 'END:VALARM'] : []), 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
