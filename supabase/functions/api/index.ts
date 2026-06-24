// BaitBuddy API — Supabase Edge Function v2 (Supabase Auth)
import { Hono } from 'jsr:@hono/hono@4.6.14';
import { cors } from 'jsr:@hono/hono@4.6.14/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
// ─── OpenAI Realtime (Echtzeit-Sprachgespräch) ────────────────────────────────
// Toleranter Key-Lookup: findet den OpenAI-Key auch unter abweichenden Secret-Namen
// (z. B. OPENAI_API_KEY, Openai_key, Open_ai_key, OPENAI_KEY …), damit ein Tippfehler
// im Supabase-Secret-Namen das Voice-Feature nicht lahmlegt.
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
  ?? Object.entries(Deno.env.toObject()).find(([k, v]) => /open.?_?ai/i.test(k) && /key|token|secret/i.test(k) && v)?.[1]
  ?? '';
const REALTIME_MODEL = Deno.env.get('OPENAI_REALTIME_MODEL') ?? 'gpt-4o-realtime-preview-2024-12-17';
const REALTIME_VOICE = Deno.env.get('OPENAI_REALTIME_VOICE') ?? 'verse';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ─── Auth via Supabase JWT ────────────────────────────────────────────────────
async function requireAuth(c: any) {
  const h = c.req.header('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return null;
  // Profil auto-anlegen beim ersten Aufruf
  let { data: profile } = await db.from('users').select('*').eq('id', user.id).single();
  if (!profile) {
    const ins = await db.from('users').insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || '' }).select().single();
    profile = ins.data;
    await db.from('premium_wallets').insert({ user_id: user.id });
  }
  return { id: user.id, email: user.email, is_admin: profile?.is_admin || false, plan: profile?.plan || 'free' };
}

// ─── Anthropic Helper ─────────────────────────────────────────────────────────
async function callClaude(opts: { system?: string; messages: any[]; max_tokens?: number }) {
  if (!ANTHROPIC_API_KEY) return { _noKey: true, text: 'KI nicht konfiguriert. Bitte ANTHROPIC_API_KEY als Supabase Secret setzen.' };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: opts.max_tokens ?? 1024, system: opts.system, messages: opts.messages }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Anthropic Fehler');
  return { text: data.content?.[0]?.text || '' };
}

const sanitize = (u: any) => { if (!u) return u; const { password_hash, ...s } = u; return s; };

const app = new Hono().basePath('/api');
app.use('*', cors({ origin: '*', allowMethods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'], allowHeaders: ['Content-Type','Authorization','x-app-name','apikey'], maxAge: 0 }));

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString(), ai: !!ANTHROPIC_API_KEY, voice: !!OPENAI_API_KEY, stripe: !!STRIPE_SECRET_KEY }));

// ─── USER / PROFIL ───────────────────────────────────────────────────────────
app.get('/auth/me', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' }, 401);
  const { data } = await db.from('users').select('*').eq('id', u.id).single();
  return c.json(sanitize(data));
});
app.patch('/auth/me', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' }, 401);
  const body = await c.req.json(); const updates: any = { updated_at: new Date() };
  for (const k of ['full_name','avatar_url']) if (body[k] !== undefined) updates[k] = body[k];
  const { data, error } = await db.from('users').update(updates).eq('id', u.id).select().single();
  return error ? c.json({ error: error.message }, 500) : c.json(sanitize(data));
});

// ─── CATCHES ─────────────────────────────────────────────────────────────────
const CATCH_FIELDS = ['species','length_cm','weight_kg','bait_used','catch_time','latitude','longitude','spot_name','water_body','weather','photo_url','notes','is_released'];
app.get('/catches', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' }, 401);
  const limit = Number(c.req.query('limit')||50), offset = Number(c.req.query('offset')||0);
  let q = db.from('catches').select('*').eq('user_id',u.id).order('catch_time',{ascending:false}).range(offset,offset+limit-1);
  const species = c.req.query('species'); if (species) q = q.eq('species',species);
  const { data, error } = await q;
  return error ? c.json({ error: error.message },500) : c.json(data);
});
app.get('/catches/stats/summary', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' },401);
  const { data } = await db.from('catches').select('species,weight_kg,length_cm,catch_time').eq('user_id',u.id);
  const sp: Record<string,number> = {}; let tw = 0, big: any = null;
  for (const ca of data||[]) { sp[ca.species]=(sp[ca.species]||0)+1; if (ca.weight_kg) tw+=ca.weight_kg; if (!big||ca.weight_kg>big.weight_kg) big=ca; }
  return c.json({ total_catches:(data||[]).length, total_weight_kg:Math.round(tw*100)/100, biggest_catch:big, species_breakdown:Object.entries(sp).sort((a,b)=>b[1]-a[1]).map(([species,count])=>({species,count})) });
});
app.get('/catches/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' },401);
  const { data, error } = await db.from('catches').select('*').eq('id',c.req.param('id')).eq('user_id',u.id).single();
  return (error||!data) ? c.json({ error:'Nicht gefunden' },404) : c.json(data);
});
app.post('/catches', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' },401);
  const body = await c.req.json(); const row: any = { user_id:u.id };
  for (const f of CATCH_FIELDS) if (body[f]!==undefined) row[f]=body[f];
  const { data, error } = await db.from('catches').insert(row).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.patch('/catches/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' },401);
  const body = await c.req.json(); const row: any = {};
  for (const f of CATCH_FIELDS) if (body[f]!==undefined) row[f]=body[f];
  const { data, error } = await db.from('catches').update(row).eq('id',c.req.param('id')).eq('user_id',u.id).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.delete('/catches/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error: 'Nicht autorisiert' },401);
  const { error } = await db.from('catches').delete().eq('id',c.req.param('id')).eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});

// ─── SPOTS ───────────────────────────────────────────────────────────────────
app.get('/spots', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error } = await db.from('spots').select('*').eq('user_id',u.id).order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.get('/spots/public', async (c) => {
  const { data, error } = await db.from('spots').select('id,name,latitude,longitude,water_type').eq('is_public',true).limit(100);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/spots', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b = await c.req.json();
  if (!b.name||b.latitude==null||b.longitude==null) return c.json({ error:'Name, Lat, Lng fehlen' },400);
  const row: any = { user_id:u.id };
  for (const f of ['name','latitude','longitude','water_type','is_favorite','is_public','notes','photo_url','group_id']) if (b[f]!==undefined) row[f]=b[f];
  const { data, error } = await db.from('spots').insert(row).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.patch('/spots/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b = await c.req.json(); const row: any = {};
  for (const f of ['name','water_type','is_favorite','is_public','notes','photo_url','group_id']) if (b[f]!==undefined) row[f]=b[f];
  const { data, error } = await db.from('spots').update(row).eq('id',c.req.param('id')).eq('user_id',u.id).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.delete('/spots/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { error } = await db.from('spots').delete().eq('id',c.req.param('id')).eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});

// ─── WEATHER ─────────────────────────────────────────────────────────────────
const wDesc = (code: number) => { if ([0,1].includes(code)) return 'Sonnig'; if ([2,3].includes(code)) return 'Bewölkt'; if ([51,53,55,61,63,65].includes(code)) return 'Regen'; if ([80,81,82].includes(code)) return 'Schauer'; if ([95,96,99].includes(code)) return 'Gewitter'; if ([45,48].includes(code)) return 'Nebel'; return 'Wechselhaft'; };
app.post('/weather', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { latitude, longitude, spotName } = await c.req.json();
  if (latitude==null||longitude==null) return c.json({ error:'Koordinaten fehlen' },400);
  const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=7`).then(r=>r.json());
  const cur = wr.current;
  let score = 0; const factors: string[] = [];
  if (cur.pressure_msl>1020){score+=2;factors.push('Hochdruck (stabil)');}else if(cur.pressure_msl<1000){score+=3;factors.push('Tiefdruck – Fische aktiv!');}else{score+=1;factors.push('Normaldruck');}
  if (cur.wind_speed_10m<5){score+=2;factors.push('Wenig Wind');}else if(cur.wind_speed_10m>15){score-=1;factors.push('Starker Wind');}else{score+=1;}
  if (cur.cloud_cover>50&&cur.cloud_cover<90){score+=1;factors.push('Gute Bewölkung');}
  if (cur.temperature_2m>=10&&cur.temperature_2m<=22){score+=1;factors.push('Optimale Temperatur');}
  const condition = score>=5?'Ausgezeichnet':score>=3?'Gut':score>=1?'Mittel':'Schwierig';
  return c.json({ location:{latitude,longitude,spotName:spotName||`${latitude},${longitude}`}, current:{temperature:Math.round(cur.temperature_2m),feels_like:Math.round(cur.apparent_temperature),humidity:cur.relative_humidity_2m,pressure:Math.round(cur.pressure_msl),wind_speed:Math.round(cur.wind_speed_10m*3.6),cloud_cover:cur.cloud_cover,precipitation:cur.precipitation||0,weather_description:wDesc(cur.weather_code)}, forecast:{today:{max_temp:Math.round(wr.daily.temperature_2m_max[0]),min_temp:Math.round(wr.daily.temperature_2m_min[0]),precipitation_probability:wr.daily.precipitation_probability_max[0]},week:wr.daily.temperature_2m_max.map((_:any,i:number)=>({date:wr.daily.time?.[i],max_temp:Math.round(wr.daily.temperature_2m_max[i]),min_temp:Math.round(wr.daily.temperature_2m_min[i]),description:wDesc(wr.daily.weather_code[i])}))}, fishing:{condition,score,factors,recommendation:score>=4?'Perfekte Bedingungen!':score>=2?'Gute Bedingungen!':'Schwierige Bedingungen.'} });
});

// ─── AI ──────────────────────────────────────────────────────────────────────
app.post('/ai/chat', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { messages = [] } = await c.req.json();
    const lastUser = [...messages].reverse().find((m:any)=>m.role==='user');
    const parts: string[] = [];
    if (lastUser&&/fang|fänge|gefangen/i.test(lastUser.content)) { const {data}=await db.from('catches').select('species,length_cm,weight_kg,bait_used').eq('user_id',u.id).order('catch_time',{ascending:false}).limit(10); if(data?.length) parts.push('FANGBUCH:\n'+data.map((x:any)=>`- ${x.species||'?'}, ${x.length_cm||'?'}cm, ${x.weight_kg||'?'}kg, Köder: ${x.bait_used||'?'}`).join('\n')); }
    if (lastUser&&/schonzeit|mindestmaß|erlaubt|verboten|gesetz|regel/i.test(lastUser.content)) { const today=new Date().toISOString().slice(0,10); const {data}=await db.from('rule_entries').select('fish,region,closed_to,min_size_cm').lte('closed_from',today).gte('closed_to',today); if(data?.length) parts.push('AKTIVE SCHONZEITEN:\n'+data.map((r:any)=>`- ${r.fish} (${r.region}): bis ${r.closed_to}`).join('\n')); }
    if (lastUser&&/spot|angelplatz|gewässer|see|fluss/i.test(lastUser.content)) { const {data}=await db.from('spots').select('name,water_type').eq('user_id',u.id).limit(20); if(data?.length) parts.push('SPOTS:\n'+data.map((s:any)=>`- ${s.name} (${s.water_type||'?'})`).join('\n')); }
    const ctx = parts.length?`\n\n--- APP-DATEN ---\n${parts.join('\n\n')}\n---`:'';
    const system = 'Du bist BaitBuddy, ein professioneller Angel-Experte. Antworte auf Deutsch, kurz und präzise.'+ctx;
    const res = await callClaude({ system, messages: messages.slice(-10).map((m:any)=>({role:m.role==='user'?'user':'assistant',content:m.content})) });
    return c.json({ reply: res.text });
  } catch(e) { return c.json({ reply:'Fehler beim KI-Chat.', error:String(e.message||e) },500); }
});
app.post('/ai/analyze-catch', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { file_url, image_base64, media_type='image/jpeg' } = await c.req.json();
    if (!file_url&&!image_base64) return c.json({ error:'file_url oder image_base64 fehlt' },400);
    const img = image_base64 ? {type:'image',source:{type:'base64',media_type,data:image_base64}} : {type:'image',source:{type:'url',url:file_url}};
    const res = await callClaude({ max_tokens:1024, messages:[{role:'user',content:[img,{type:'text',text:'Analysiere diesen Fisch. Antworte NUR mit JSON: {"species":"deutscher Name","length_cm":Zahl,"weight_kg":Zahl,"confidence_species":0.0-1.0,"visual_details":"kurz"}'}]}] });
    if ((res as any)._noKey) return c.json({ error:res.text },503);
    let r: any; try { r=JSON.parse(res.text.replace(/```json|```/g,'').trim()); } catch { r={species:'Unbekannt',confidence_species:0}; }
    return c.json({ tasks:[{name:'Art',status:r.species?'completed':'failed',result:r.species||'Nicht erkannt'},{name:'Länge',status:r.length_cm?'completed':'failed',result:r.length_cm?`${Math.round(r.length_cm)} cm`:'–'},{name:'Gewicht',status:r.weight_kg?'completed':'failed',result:r.weight_kg?`${r.weight_kg.toFixed(2)} kg`:'–'}], summary:r.species?`${r.species}, ca. ${Math.round(r.length_cm||0)}cm, ~${(r.weight_kg||0).toFixed(2)}kg. ${r.visual_details||''}`:'Fisch nicht erkannt.', result_data:r });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.post('/ai/fishing-recommendation', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { latitude, longitude } = await c.req.json();
    const [w,{data:catches}]=await Promise.all([fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,surface_pressure,wind_speed_10m&timezone=auto`).then(r=>r.json()),db.from('catches').select('species,bait_used').eq('user_id',u.id).limit(50)]);
    const sp: Record<string,number>={}; for(const x of catches||[]) if(x.species) sp[x.species]=(sp[x.species]||0)+1;
    const res=await callClaude({max_tokens:512,messages:[{role:'user',content:`Angel-Empfehlung. Wetter: ${w.current?.temperature_2m}°C, Druck ${w.current?.surface_pressure}hPa. Häufige Arten: ${Object.keys(sp).join(', ')||'keine'}. JSON: {"optimal_times":[],"recommended_baits":[],"target_species":[],"weather_rating":"Gut","summary":"","tips":[]}`}]});
    let rec: any; try{rec=JSON.parse(res.text.replace(/```json|```/g,''));}catch{rec={summary:res.text||'Nicht verfügbar',weather_rating:'Mittel',tips:[]};}
    return c.json({ recommendation:rec, weather:w.current, catchCount:(catches||[]).length });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.post('/ai/predict-fishing', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { latitude, longitude, target_species, date }=await c.req.json();
    const w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,surface_pressure,wind_speed_10m&timezone=auto`).then(r=>r.json());
    const res=await callClaude({max_tokens:512,messages:[{role:'user',content:`Angelerfolg-Vorhersage. Koordinaten: ${latitude},${longitude}. Zielart: ${target_species||'allgemein'}. Datum: ${date||'heute'}. Wetter: ${JSON.stringify(w.current)}. JSON: {"success_probability":75,"best_time":"07:00-09:00","recommended_depth":"2-4m","reasoning":""}`}]});
    let p: any; try{p=JSON.parse(res.text.replace(/```json|```/g,''));}catch{p={success_probability:50,reasoning:res.text||'Nicht verfügbar'};}
    return c.json({ prediction:p, weather:w.current });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.post('/ai/generate-catch-report', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { period='30d' }=await c.req.json(); const days=parseInt(period)||30;
    const since=new Date(Date.now()-days*86400000).toISOString();
    const {data:catches}=await db.from('catches').select('species,length_cm,weight_kg,bait_used,catch_time').eq('user_id',u.id).gte('catch_time',since);
    const res=await callClaude({max_tokens:1024,messages:[{role:'user',content:`Angelbericht (Deutsch) für ${days} Tage. Fänge: ${JSON.stringify(catches)}. Zusammenfassung, Highlights, Tipps.`}]});
    return c.json({ report:res.text, catch_count:(catches||[]).length, period_days:days });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.post('/ai/evaluate-catch', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { catch_data, context }=await c.req.json();
    const res=await callClaude({max_tokens:256,messages:[{role:'user',content:`Bewerte Fang (0-100): ${JSON.stringify(catch_data)}. Kontext: ${context||'Standard'}. JSON: {"score":85,"reasoning":"","bonus_points":[]}`}]});
    let r: any; try{r=JSON.parse(res.text.replace(/```json|```/g,''));}catch{r={score:50,reasoning:res.text||'Nicht verfügbar'};}
    return c.json(r);
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.post('/ai/tts', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { text }=await c.req.json(); if (!text) return c.json({ error:'Text fehlt' },400);
  return c.json({ text, use_browser_tts:true });
});

// ─── REALTIME VOICE (OpenAI Realtime API, Speech-to-Speech) ───────────────────
// Prägt ein kurzlebiges Ephemeral-Token. Der echte OPENAI_API_KEY bleibt
// ausschließlich serverseitig; der Browser bekommt nur ein ~60s gültiges Token,
// mit dem er die WebRTC-Verbindung zu OpenAI direkt aufbaut.
app.post('/ai/realtime-session', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  if (!OPENAI_API_KEY) return c.json({ error:'Voice nicht konfiguriert. Bitte OPENAI_API_KEY als Supabase Secret setzen.' },503);
  try {
    // Leichten, persönlichen Kontext laden, damit sich das Gespräch echt anfühlt
    const parts: string[] = [];
    const { data: catches } = await db.from('catches')
      .select('species,length_cm,weight_kg,bait_used,catch_time')
      .eq('user_id', u.id).order('catch_time', { ascending: false }).limit(8);
    if (catches?.length) {
      parts.push('Letzte Fänge: ' + catches.map((x:any)=>`${x.species||'?'} (${x.length_cm||'?'}cm${x.bait_used?', Köder '+x.bait_used:''})`).join(', '));
    }
    const today = new Date().toISOString().slice(0,10);
    const { data: rules } = await db.from('rule_entries')
      .select('fish,region,closed_to').lte('closed_from', today).gte('closed_to', today).limit(15);
    if (rules?.length) {
      parts.push('Aktive Schonzeiten gerade: ' + rules.map((r:any)=>`${r.fish} (${r.region}) bis ${r.closed_to}`).join(', '));
    }
    const ctx = parts.length ? `\n\nWas du über diesen Angler weißt:\n- ${parts.join('\n- ')}` : '';

    const instructions = `Du bist BaitBuddy – ein erfahrener, sympathischer Angel-Kumpel und Experte. ` +
      `Du sprichst Deutsch und redest locker und natürlich wie in einem echten Gespräch am Wasser, ` +
      `nicht wie ein steifer Assistent. Halte deine Antworten kurz und gesprächig (meist 1 bis 3 Sätze), ` +
      `nutze Alltagssprache, stell auch mal eine kurze Rückfrage und zeig echtes Interesse. ` +
      `Du hilfst bei Ködern, Montagen, Techniken, Wetter, Schonzeiten, Spots und allem rund ums Angeln. ` +
      `Wenn du etwas nicht sicher weißt, sag es ehrlich statt zu raten. ` +
      `Sprich keine Sonderzeichen, Sternchen oder Aufzählungspunkte aus – formuliere alles als flüssige Sätze.` + ctx;

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        modalities: ['audio', 'text'],
        instructions,
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
          create_response: true,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) return c.json({ error: data.error?.message || 'OpenAI Realtime Fehler' }, r.status === 401 ? 502 : 500);
    return c.json({ client_secret: data.client_secret, model: REALTIME_MODEL, voice: REALTIME_VOICE });
  } catch (e) { return c.json({ error: String(e.message||e) }, 500); }
});

// ─── WATER ───────────────────────────────────────────────────────────────────
app.post('/water', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { latitude, longitude, spotName }=await c.req.json();
    const [w,m]=await Promise.all([fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,cloud_cover&timezone=auto`).then(r=>r.json()),fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&current=wave_height&timezone=auto`).then(r=>r.json()).catch(()=>null)]);
    const cur=w.current||{}; const waterTemp=Math.max(0,(cur.temperature_2m||15)-3);
    let score=70; if(cur.wind_speed_10m<5) score+=10; if(cur.wind_speed_10m>15) score-=20; if(cur.cloud_cover>50&&cur.cloud_cover<85) score+=5; if(waterTemp>=8&&waterTemp<=20) score+=15; score=Math.min(100,Math.max(0,score));
    await db.from('water_analysis_history').insert({user_id:u.id,latitude,longitude,spot_name:spotName,analysis_data:{waterTemp,score}}).then(()=>{},()=>{});
    return c.json({ location:{latitude,longitude,spotName}, temperature:Math.round(waterTemp*10)/10, quality_score:score, wave_height:m?.current?.wave_height||0, algae_risk:score<50?'Hoch':score<70?'Mittel':'Gering', fishing_forecast:score>=80?'Ausgezeichnet':score>=60?'Gut':score>=40?'Mittel':'Schlecht' });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.get('/water/history', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('water_analysis_history').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(20);
  return error ? c.json({ error:error.message },500) : c.json(data);
});

// ─── FISHING ─────────────────────────────────────────────────────────────────
app.get('/fishing/rules', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  let q=db.from('rule_entries').select('*').order('fish');
  const fish=c.req.query('fish'); const bl=c.req.query('bundesland');
  if (fish) q=q.ilike('fish',`%${fish}%`); if (bl) q=q.eq('bundesland',bl);
  const { data, error }=await q; return error ? c.json({ error:error.message },500) : c.json(data);
});
app.get('/fishing/rules/active', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const today=new Date().toISOString().slice(0,10);
  const { data, error }=await db.from('rule_entries').select('*').lte('closed_from',today).gte('closed_to',today);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.get('/fishing/clubs', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('fishing_clubs').select('*').limit(Number(c.req.query('limit')||50));
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/fishing/clubs/nearby', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { latitude, longitude, radius_km=50 }=await c.req.json();
  const { data }=await db.from('fishing_clubs').select('*').not('latitude','is',null).limit(200);
  const near=(data||[]).filter((cl:any)=>cl.latitude&&cl.longitude&&Math.sqrt((cl.latitude-latitude)**2+(cl.longitude-longitude)**2)*111<=radius_km);
  return c.json(near.slice(0,50));
});
app.get('/fishing/licenses', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('licenses').select('*').eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/fishing/licenses', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('licenses').insert({user_id:u.id,type:b.type,valid_from:b.valid_from,valid_until:b.valid_until,number:b.number,issuer:b.issuer,notes:b.notes}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.get('/fishing/plans', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('fishing_plans').select('*').eq('user_id',u.id).order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/fishing/plans', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('fishing_plans').insert({user_id:u.id,title:b.title,target_fish:b.target_fish,spot_info:b.spot_info,steps:b.steps,planned_date:b.planned_date,is_active:b.is_active}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.delete('/fishing/plans/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { error }=await db.from('fishing_plans').delete().eq('id',c.req.param('id')).eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});
app.get('/fishing/hotspots', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data }=await db.from('catches').select('latitude,longitude,species').eq('user_id',u.id).not('latitude','is',null);
  const grid: Record<string,any>={};
  for(const ca of data||[]) { const k=`${Math.round(ca.latitude*10)/10}_${Math.round(ca.longitude*10)/10}`; if(!grid[k]) grid[k]={latitude:ca.latitude,longitude:ca.longitude,count:0,species:{}}; grid[k].count++; if(ca.species) grid[k].species[ca.species]=(grid[k].species[ca.species]||0)+1; }
  return c.json(Object.values(grid).sort((a:any,b:any)=>b.count-a.count).slice(0,20));
});

// ─── COMMUNITY ───────────────────────────────────────────────────────────────
app.get('/community/posts', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const limit=Number(c.req.query('limit')||20),offset=Number(c.req.query('offset')||0);
  const { data, error }=await db.from('posts').select('*,users(full_name,avatar_url)').order('created_at',{ascending:false}).range(offset,offset+limit-1);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/community/posts', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json(); if(!b.text) return c.json({ error:'Text fehlt' },400);
  const { data, error }=await db.from('posts').insert({user_id:u.id,text:b.text,photo_url:b.photo_url,catch_id:b.catch_id}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.delete('/community/posts/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { error }=await db.from('posts').delete().eq('id',c.req.param('id')).eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});
app.post('/community/posts/:id/like', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data:p }=await db.from('posts').select('likes').eq('id',c.req.param('id')).single();
  await db.from('posts').update({likes:(p?.likes||0)+1}).eq('id',c.req.param('id'));
  return c.json({ ok:true });
});
app.get('/community/posts/:id/comments', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('comments').select('*,users(full_name,avatar_url)').eq('post_id',c.req.param('id')).order('created_at');
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/community/posts/:id/comments', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('comments').insert({user_id:u.id,post_id:c.req.param('id'),text:b.text}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.get('/community/voting/leaderboard', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('voting_submissions').select('*,users(full_name,avatar_url)').order('likes',{ascending:false}).limit(20);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/community/voting/submit', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('voting_submissions').insert({user_id:u.id,catch_id:b.catch_id,photo_url:b.photo_url,title:b.title,description:b.description,event_id:b.event_id}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.post('/community/voting/:id/like', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { error }=await db.from('voting_likes').insert({user_id:u.id,submission_id:c.req.param('id')}).select().single();
  if (error&&error.code==='23505') return c.json({ error:'Bereits geliked' },409);
  if (error) return c.json({ error:error.message },500);
  const { data:s }=await db.from('voting_submissions').select('likes').eq('id',c.req.param('id')).single();
  await db.from('voting_submissions').update({likes:(s?.likes||0)+1}).eq('id',c.req.param('id'));
  return c.json({ ok:true });
});
app.get('/community/clans', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('clans').select('*').order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/community/clans', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json(); if(!b.name) return c.json({ error:'Name fehlt' },400);
  const { data:clan, error }=await db.from('clans').insert({name:b.name,description:b.description,logo_url:b.logo_url,owner_id:u.id}).select().single();
  if (error) return c.json({ error:error.message },500);
  await db.from('clan_members').insert({clan_id:clan.id,user_id:u.id,role:'owner'});
  return c.json(clan,201);
});
app.post('/community/clans/:id/join', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('clan_members').insert({clan_id:c.req.param('id'),user_id:u.id}).select().single();
  if (error&&error.code==='23505') return c.json({ error:'Bereits Mitglied' },409);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true,membership:data });
});

// ─── PREMIUM ─────────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string,any>={ basic:{price:499,interval:'month',name:'Basic'}, pro:{price:999,interval:'month',name:'Pro'}, ultimate:{price:1999,interval:'month',name:'Ultimate'} };
const PLAN_FEATURES: Record<string,any>={ free:{ai_chats:5,spots:10,catches:50}, basic:{ai_chats:50,spots:50,catches:500}, pro:{ai_chats:200,spots:200,catches:2000,voice:true,analyze:true}, ultimate:{ai_chats:-1,spots:-1,catches:-1,voice:true,analyze:true,clan:true} };
app.get('/premium/status', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data:user }=await db.from('users').select('plan,plan_expires_at').eq('id',u.id).single();
  const { data:wallet }=await db.from('premium_wallets').select('credits').eq('user_id',u.id).single();
  const expired=user?.plan_expires_at&&new Date(user.plan_expires_at)<new Date();
  const plan=expired?'free':(user?.plan||'free');
  return c.json({ plan, expires_at:user?.plan_expires_at, is_expired:expired, credits:wallet?.credits||0, features:PLAN_FEATURES[plan]||PLAN_FEATURES.free });
});
app.get('/premium/products', async (c) => c.json({ plans:Object.entries(PLAN_CONFIG).map(([id,cfg]:any)=>({id,name:cfg.name,price_cents:cfg.price,price_eur:(cfg.price/100).toFixed(2),interval:cfg.interval,features:PLAN_FEATURES[id]||{}})) }));
app.post('/premium/check-feature', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { feature }=await c.req.json();
  const { data:user }=await db.from('users').select('plan').eq('id',u.id).single();
  const f=PLAN_FEATURES[user?.plan||'free']||PLAN_FEATURES.free;
  return c.json({ has_access:f[feature]===true||f[feature]===-1||(typeof f[feature]==='number'&&f[feature]>0), plan:user?.plan||'free' });
});
app.post('/premium/activate-demo', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  await db.from('users').update({plan:'pro',demo_mode:true,plan_expires_at:new Date(Date.now()+3*86400000).toISOString()}).eq('id',u.id);
  return c.json({ ok:true, demo:true, plan:'pro', expires_in_hours:72 });
});
app.post('/premium/checkout', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  if (!STRIPE_SECRET_KEY) return c.json({ error:'Stripe nicht konfiguriert.' },503);
  try {
    const { plan_id }=await c.req.json(); const plan=PLAN_CONFIG[plan_id]; if (!plan) return c.json({ error:'Ungültiger Plan' },400);
    const frontend='https://bait-buddy.vercel.app'; const form=new URLSearchParams();
    form.set('mode','subscription'); form.set('success_url',`${frontend}/?success=true`); form.set('cancel_url',`${frontend}/premium`);
    form.set('customer_email',u.email); form.set('client_reference_id',u.id); form.set('metadata[user_id]',u.id); form.set('metadata[plan_id]',plan_id);
    form.set('line_items[0][quantity]','1'); form.set('line_items[0][price_data][currency]','eur');
    form.set('line_items[0][price_data][product_data][name]',`BaitBuddy ${plan.name}`);
    form.set('line_items[0][price_data][unit_amount]',String(plan.price)); form.set('line_items[0][price_data][recurring][interval]',plan.interval);
    const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const session=await r.json(); if(!r.ok) throw new Error(session.error?.message||'Stripe Fehler');
    return c.json({ ok:true, checkout_url:session.url, session_id:session.id });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────
app.get('/events', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('events').select('*').eq('is_active',true).order('starts_at');
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/events', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json(); if(!b.title) return c.json({ error:'Titel fehlt' },400);
  const { data, error }=await db.from('events').insert({title:b.title,description:b.description,starts_at:b.starts_at,ends_at:b.ends_at,target_species:b.target_species,scoring_type:b.scoring_type,created_by:u.id}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.get('/events/:id/leaderboard', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('event_entries').select('*,users(full_name,avatar_url)').eq('event_id',c.req.param('id')).order('score',{ascending:false}).limit(50);
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/events/:id/submit', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('event_entries').insert({event_id:c.req.param('id'),user_id:u.id,catch_id:b.catch_id,score:b.score}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});

// ─── GEAR ────────────────────────────────────────────────────────────────────
app.get('/gear', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('gear_listings').select('*').eq('user_id',u.id).order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/gear', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json(); const row: any={user_id:u.id};
  for(const f of ['name','category','brand','model','condition','price','description','photo_url','is_for_sale']) if(b[f]!==undefined) row[f]=b[f];
  const { data, error }=await db.from('gear_listings').insert(row).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});
app.patch('/gear/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json(); const row: any={};
  for(const f of ['name','category','brand','model','condition','price','description','photo_url','is_for_sale']) if(b[f]!==undefined) row[f]=b[f];
  const { data, error }=await db.from('gear_listings').update(row).eq('id',c.req.param('id')).eq('user_id',u.id).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.delete('/gear/:id', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { error }=await db.from('gear_listings').delete().eq('id',c.req.param('id')).eq('user_id',u.id);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});
app.get('/gear/baits', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { data, error }=await db.from('bait_recipes').select('*').or(`user_id.eq.${u.id},is_public.eq.true`).order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.post('/gear/baits', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const b=await c.req.json();
  const { data, error }=await db.from('bait_recipes').insert({user_id:u.id,name:b.name,ingredients:b.ingredients,instructions:b.instructions,target_fish:b.target_fish,is_public:b.is_public}).select().single();
  return error ? c.json({ error:error.message },500) : c.json(data,201);
});

// ─── UPLOAD ──────────────────────────────────────────────────────────────────
const EXT: Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic'};
app.post('/upload', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  try {
    const { image_base64, media_type='image/jpeg', folder='catches' }=await c.req.json();
    if (!image_base64) return c.json({ error:'image_base64 fehlt' },400);
    const ext=EXT[media_type]||'jpg'; const f=['catches','avatars','posts','gear','spots'].includes(folder)?folder:'misc';
    const path=`${f}/${u.id}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const bin=Uint8Array.from(atob(image_base64.replace(/^data:image\/\w+;base64,/,'')),ch=>ch.charCodeAt(0));
    if (bin.length>10*1024*1024) return c.json({ error:'Datei zu groß (max 10 MB)' },413);
    const { error }=await db.storage.from('baitbuddy').upload(path,bin,{contentType:media_type,upsert:false});
    if (error) throw error;
    const { data:pub }=db.storage.from('baitbuddy').getPublicUrl(path);
    return c.json({ ok:true, file_url:pub.publicUrl, path });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});
app.delete('/upload', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const { path }=await c.req.json();
  if (!path||!path.includes(u.id)) return c.json({ error:'Kein Zugriff' },403);
  const { error }=await db.storage.from('baitbuddy').remove([path]);
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});

// ─── USER ACCOUNT ─────────────────────────────────────────────────────────────
app.delete('/user/account', async (c) => {
  const u = await requireAuth(c); if (!u) return c.json({ error:'Nicht autorisiert' },401);
  const tables=['voting_likes','voting_submissions','clan_catches','comments','posts','chat_messages','chat_sessions','catches','spot_groups','spots','bathymetric_maps','depth_data_points','fishing_plans','bait_recipes','gear_listings','licenses','water_analysis_history','usage_sessions','premium_events','premium_wallets','clan_members'];
  for (const t of tables) await db.from(t).delete().eq('user_id',u.id);
  await db.from('users').delete().eq('id',u.id);
  await db.auth.admin.deleteUser(u.id);
  return c.json({ success:true });
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────
async function requireAdmin(c: any) { const u=await requireAuth(c); return u?.is_admin?u:null; }
app.get('/admin/users', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error:'Kein Zugriff' },403);
  const { data, error }=await db.from('users').select('id,email,full_name,plan,plan_expires_at,is_admin,created_at').order('created_at',{ascending:false});
  return error ? c.json({ error:error.message },500) : c.json(data);
});
app.get('/admin/stats', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error:'Kein Zugriff' },403);
  const [u,ca,sp,ev]=await Promise.all([db.from('users').select('id',{count:'exact',head:true}),db.from('catches').select('id',{count:'exact',head:true}),db.from('spots').select('id',{count:'exact',head:true}),db.from('events').select('id',{count:'exact',head:true})]);
  return c.json({ users:u.count, catches:ca.count, spots:sp.count, events:ev.count });
});
app.post('/admin/users/:id/plan', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error:'Kein Zugriff' },403);
  const { plan, expires_at }=await c.req.json();
  const { error }=await db.from('users').update({plan,plan_expires_at:expires_at}).eq('id',c.req.param('id'));
  return error ? c.json({ error:error.message },500) : c.json({ ok:true });
});

// ─── STRIPE WEBHOOK ──────────────────────────────────────────────────────────
app.post('/stripe/webhook', async (c) => {
  if (!STRIPE_WEBHOOK_SECRET) return c.json({ error:'Webhook nicht konfiguriert' },503);
  try {
    const sig=c.req.header('stripe-signature')||''; const body=await c.req.text();
    const parts=Object.fromEntries(sig.split(',').map(p=>p.split('=')));
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${parts.t}.${body}`));
    const expected=Array.from(new Uint8Array(mac)).map(b=>b.toString(16).padStart(2,'0')).join('');
    if (expected!==parts.v1) return c.json({ error:'Ungültige Signatur' },400);
    const event=JSON.parse(body);
    if (event.type==='checkout.session.completed') {
      const s=event.data.object; const {user_id,plan_id}=s.metadata||{};
      if (user_id&&plan_id) { await db.from('users').update({plan:plan_id,plan_expires_at:new Date(Date.now()+31*86400000).toISOString(),demo_mode:false}).eq('id',user_id); await db.from('premium_events').insert({user_id,event_type:'purchase',plan:plan_id,stripe_session_id:s.id}); }
    }
    return c.json({ received:true });
  } catch(e) { return c.json({ error:String(e.message||e) },500); }
});

app.all('*', (c) => c.json({ error:'Route nicht gefunden' },404));
Deno.serve(app.fetch);
