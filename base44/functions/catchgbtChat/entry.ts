import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Erkennt welche Daten der Nutzer braucht
function detectIntent(text) {
  const lower = text.toLowerCase();
  return {
    wantsCatches:    /fang|fänge|gefangen|fangbuch|logbuch|mein.*fisch|letzter fang/i.test(text),
    wantsWeather:    /wetter|temperatur|wind|regen|luftdruck|klima|forecast/i.test(text),
    wantsRules:      /schonzeit|mindestmaß|erlaubt|verboten|gesetz|regel|vorschrift|saison/i.test(text),
    wantsSpots:      /spot|angelplatz|ort|stelle|wo angel|gewässer|see|fluss|teich/i.test(text),
    wantsAnalysis:   /analyse|wassertemperatur|chlorophyll|trübung|algen|satelliten|qualität/i.test(text),
  };
}

async function fetchContextData(base44, intent, userEmail, userLocation) {
  const tasks = [];

  // Fangbuch
  if (intent.wantsCatches) {
    tasks.push(
      base44.asServiceRole.entities.Catch
        .filter({ created_by: userEmail }, '-catch_time', 10)
        .then(catches => ({ type: 'catches', data: catches }))
        .catch(() => null)
    );
    tasks.push(
      base44.asServiceRole.entities.Spot
        .filter({ created_by: userEmail }, '-created_date', 20)
        .then(spots => ({ type: 'spots', data: spots }))
        .catch(() => null)
    );
  }

  // Schonzeiten
  if (intent.wantsRules) {
    tasks.push(
      base44.asServiceRole.entities.RuleEntry
        .list('-created_date', 50)
        .then(rules => ({ type: 'rules', data: rules }))
        .catch(() => null)
    );
  }

  // Spots ohne Fangbuch-Intent
  if (intent.wantsSpots && !intent.wantsCatches) {
    tasks.push(
      base44.asServiceRole.entities.Spot
        .filter({ created_by: userEmail }, '-created_date', 20)
        .then(spots => ({ type: 'spots', data: spots }))
        .catch(() => null)
    );
    tasks.push(
      base44.asServiceRole.entities.FishingClub
        .list('-created_date', 30)
        .then(clubs => ({ type: 'clubs', data: clubs }))
        .catch(() => null)
    );
  }

  // Wetterdaten
  if ((intent.wantsWeather || intent.wantsAnalysis) && userLocation?.latitude && userLocation?.longitude) {
    const functionName = intent.wantsAnalysis ? 'getWaterData' : 'getWeatherForLocation';
    tasks.push(
      base44.asServiceRole.functions.invoke(functionName, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        spotName: userLocation.spotName || 'Aktueller Standort',
        saveHistory: false
      })
      .then(res => ({ type: intent.wantsAnalysis ? 'waterAnalysis' : 'weather', data: res?.data || res }))
      .catch(() => null)
    );
  }

  const results = await Promise.allSettled(tasks);
  const context = {};

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      context[r.value.type] = r.value.data;
    }
  }

  return context;
}

function buildContextSection(ctx) {
  const parts = [];

  if (ctx.catches?.length) {
    const summary = ctx.catches.map(c =>
      `- ${c.species || 'Unbekannt'}, ${c.length_cm || '?'}cm, ${c.weight_kg || '?'}kg, Koeder: ${c.bait_used || '?'}, am ${c.catch_time ? new Date(c.catch_time).toLocaleDateString('de-DE') : '?'}${c.notes ? ', Notiz: ' + c.notes : ''}`
    ).join('\n');
    parts.push(`FANGBUCH DES NUTZERS (letzte 10 Fänge):\n${summary}`);
  }

  if (ctx.spots?.length) {
    const summary = ctx.spots.map(s =>
      `- ${s.name} (${s.water_type || '?'}), Koordinaten: ${s.latitude?.toFixed(4)}, ${s.longitude?.toFixed(4)}${s.notes ? ', Notiz: ' + s.notes : ''}`
    ).join('\n');
    parts.push(`ANGELPLAETZE DES NUTZERS:\n${summary}`);
  }

  if (ctx.clubs?.length) {
    const summary = ctx.clubs.slice(0, 15).map(c =>
      `- ${c.name} (${c.category || '?'}), ${c.address?.city || '?'}`
    ).join('\n');
    parts.push(`ANGELVEREINE UND ANGELPARKS IN DER DATENBANK:\n${summary}`);
  }

  if (ctx.rules?.length) {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${mm}-${dd}`;

    const activeRules = ctx.rules.filter(r => {
      if (!r.closed_from || !r.closed_to) return false;
      return todayStr >= r.closed_from && todayStr <= r.closed_to;
    });

    const upcomingRules = ctx.rules.filter(r => {
      if (!r.closed_from) return false;
      const diff = new Date(r.closed_from) - today;
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    });

    if (activeRules.length) {
      const s = activeRules.map(r =>
        `- ${r.fish} (${r.region}): Schonzeit bis ${r.closed_to}${r.min_size_cm ? ', Mindestmass ' + r.min_size_cm + 'cm' : ''}`
      ).join('\n');
      parts.push(`AKTUELL AKTIVE SCHONZEITEN (heute: ${todayStr}):\n${s}`);
    }

    if (upcomingRules.length) {
      const s = upcomingRules.map(r =>
        `- ${r.fish} (${r.region}): Schonzeit beginnt ${r.closed_from}`
      ).join('\n');
      parts.push(`BALD BEGINNENDE SCHONZEITEN (naechste 30 Tage):\n${s}`);
    }

    if (!activeRules.length && !upcomingRules.length) {
      parts.push(`SCHONZEITEN: Keine aktuell aktiven Schonzeiten in den Daten. Es gibt insgesamt ${ctx.rules.length} Regeleintraege in der Datenbank.`);
    }
  }

  if (ctx.weather?.current) {
    const w = ctx.weather.current;
    const f = ctx.weather.fishing;
    parts.push(
      `AKTUELLES WETTER AM STANDORT:\n` +
      `Temperatur: ${w.temperature}°C (gefühlt ${w.feels_like}°C)\n` +
      `Wind: ${w.wind_speed} km/h aus ${w.wind_direction}°\n` +
      `Luftdruck: ${w.pressure} hPa\n` +
      `Bewölkung: ${w.cloud_cover}%, Niederschlag: ${w.precipitation}mm\n` +
      `Wetterlage: ${w.weather_description}\n` +
      `Angelbedingungen: ${f?.condition || '?'} (Score: ${f?.score || '?'})\n` +
      `Empfehlung: ${f?.recommendation || ''}`
    );
  }

  if (ctx.waterAnalysis) {
    const a = ctx.waterAnalysis;
    parts.push(
      `WASSERANALYSE AM STANDORT:\n` +
      `Wassertemperatur: ${a.temperature}°C\n` +
      `Qualitätsscore: ${a.quality_score}/100\n` +
      `Wetterlage: ${a.weather_condition}\n` +
      `Prognose: ${a.fishing_forecast}\n` +
      `Wind: ${a.wind_speed} m/s, Wellen: ${a.wave_height}m\n` +
      `Chlorophyll-a: ${a.chlorophyll_a || 'nicht verfügbar'}, Trübung: ${a.turbidity_ntu || 'nicht verfügbar'}\n` +
      `Algenrisiko: ${a.algae_risk || 'unbekannt'}`
    );
  }

  return parts.length > 0
    ? `\n\n--- AKTUELLE DATEN AUS DER APP ---\n${parts.join('\n\n')}\n--- ENDE DATEN ---\n`
    : '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages = [], context = 'general', userLocation = null } = body;

    console.log(`[catchgbtChat] User=${user.email}, Messages=${messages.length}`);

    // Letzte Nutzernachricht für Intent-Erkennung
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const intent = lastUserMsg ? detectIntent(lastUserMsg.content) : {};

    // Schneller Datenabruf mit Timeout (max 2 Sekunden)
    let contextData = {};
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Context fetch timeout')), 2000)
      );
      contextData = await Promise.race([
        fetchContextData(base44, intent, user.email, userLocation),
        timeoutPromise
      ]);
    } catch (timeoutError) {
      console.warn('[catchgbtChat] Context data fetch timed out, using fallback');
      // Fortsetzen ohne Daten ist besser als Timeout
    }

    const contextSection = buildContextSection(contextData);

    const systemPrompt =
      'Du bist BaitBuddy, ein professioneller Angel-Experte und Sprach-Assistent fuer eine Angel-App. ' +
      'Gib kurze, hilfreiche Antworten. Keine Emojis. ' +
      'Du hast vollen Zugriff auf alle App-Funktionen und kannst Eintraege fuer den Nutzer machen, wenn er es wuenscht.\n\n' +
      'WICHTIG - DU KANNST AKTIONEN AUSFUEHREN:\n' +
      'Wenn der Nutzer eine konkrete Aktion will, antworte ZUSAETZLICH zu deiner normalen Antwort am Ende mit einem JSON-Action-Block in genau diesem Format:\n' +
      '<<ACTION>>{"type":"...","params":{...}}<<END>>\n\n' +
      'Verfuegbare Aktionen:\n' +
      '1. Fang ins Fangbuch eintragen:\n' +
      '   <<ACTION>>{"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch","notes":"optional","is_released":false}}<<END>>\n' +
      '   (species ist Pflicht, Rest optional)\n' +
      '2. Community-Post erstellen:\n' +
      '   <<ACTION>>{"type":"post_community","params":{"text":"Heute super Fang am See!"}}<<END>>\n' +
      '3. Seite in App oeffnen:\n' +
      '   <<ACTION>>{"type":"navigate","params":{"page":"Logbook"}}<<END>>\n' +
      '   Verfuegbare Seiten: Dashboard, Logbook, Map, Weather, Community, Gear, AIAssistant, TripPlanner, Profile, Settings, Rank, WaterAnalysis, AngelscheinPruefungSchonzeiten, Quiz, Licenses, Events, BaitMixer, CatchStats, ARKnotenAssistent, Shop, PremiumPlans, VoiceControl, Help, Tutorials, Devices, WeatherAlerts.\n' +
      '4. Spot speichern:\n' +
      '   <<ACTION>>{"type":"save_spot","params":{"name":"Mein Lieblingsplatz","latitude":52.5,"longitude":13.4,"water_type":"see","notes":"optional","is_favorite":true}}<<END>>\n' +
      '5. Trip im Tripplaner anlegen:\n' +
      '   <<ACTION>>{"type":"create_trip","params":{"title":"Hechttour Mueggelsee","target_fish":"Hecht","spot_info":"Mueggelsee Ostufer","steps":["Schritt 1","Schritt 2"],"is_active":true}}<<END>>\n' +
      '6. Support-Ticket erstellen:\n' +
      '   <<ACTION>>{"type":"support_ticket","params":{"subject":"Problem","message":"Beschreibung","category":"bug"}}<<END>>\n\n' +
      'Erstelle nur eine Action wenn der Nutzer eine eindeutige Aufforderung gibt (z.B. "trag den Fang ein", "oeffne das Fangbuch", "speichere diesen Spot"). ' +
      'Bei Unsicherheit frag nach. Bestaetige Aktionen kurz im Text. ' +
      'Wenn der Nutzer Daten lesen/abfragen will (Fangbuch, Wetter, Schonzeiten), nutze die bereits eingebauten Daten oben und gib sie kurz wieder - KEINE Action noetig dafuer.';

    const conversationHistory = messages.slice(-6).map(msg =>
      `${msg.role === 'user' ? 'Nutzer' : 'Du'}: ${msg.content || ''}`
    ).join('\n');

    const fullPrompt =
      `${systemPrompt}` +
      `${contextSection}` +
      `\n\nKonversation:\n${conversationHistory}\n\nAntworte kurz und praezise:`;

    let reply = 'Entschuldigung, ich konnte deine Frage verarbeiten. Versuche es nochmal.';

    try {
      console.log('[catchgbtChat] Invoking LLM...');
      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false,
        model: 'gemini_3_flash'
      });
      reply = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.content || reply);
      console.log('[catchgbtChat] LLM Response OK:', reply.substring(0, 50) + '...');
    } catch (llmError) {
      console.error('[catchgbtChat] LLM Error:', llmError.message);
    }

    return Response.json({ reply }, { status: 200 });

  } catch (error) {
    console.error('[catchgbtChat] Critical error:', error.message, error);
    return Response.json({
      reply: 'Ein Fehler ist aufgetreten. Bitte versuche es nochmal.'
    }, { status: 200 });
  }
});