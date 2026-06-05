import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

function getFishingScore(weather) {
  if (!weather) return null;
  const temp = weather.temperature_2m;
  const wind = weather.wind_speed_10m;
  const code = weather.weather_code || 0;
  let score = 0;
  if (temp >= 10 && temp <= 22) score += 3;
  else if (temp >= 5 && temp <= 28) score += 2;
  else score += 1;
  if (wind < 10) score += 2;
  else if (wind < 20) score += 1;
  if (code < 3) score += 2;
  else if (code < 60) score += 1;
  if (score >= 6) return { label: 'Sehr gut', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-700/40', bar: 'bg-emerald-400', pct: 95 };
  if (score >= 4) return { label: 'Gut', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/40', bar: 'bg-green-400', pct: 70 };
  if (score >= 3) return { label: 'Mittel', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30', bar: 'bg-yellow-400', pct: 45 };
  return { label: 'Schlecht', color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30', bar: 'bg-red-400', pct: 20 };
}

export default function Home() {
  const { user } = useAuth();
  const [weather, setWeather] = useState(null);

  const { data: catchesData } = useQuery({
    queryKey: ['catches'],
    queryFn: () => api.get('/api/catches'),
  });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async pos => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m&timezone=auto`);
        const d = await r.json();
        if (d.current) setWeather(d.current);
      } catch {}
    });
  }, []);

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Angler';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? `Guten Morgen, ${name}` : hour < 18 ? `Hallo, ${name}` : `Guten Abend, ${name}`;
  const score = getFishingScore(weather);
  const catches = catchesData?.catches || [];
  const todayCount = catches.filter(c => new Date(c.catch_time).toDateString() === new Date().toDateString()).length;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">{greeting} 🎣</h1>

      {/* Wetter + Angelprognose */}
      {weather && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-900/40 to-cyan-900/20 p-5 border border-blue-800/30 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-cyan-400/70 uppercase tracking-wider mb-1">Aktuelles Wetter</p>
              <p className="text-4xl font-bold text-white">{Math.round(weather.temperature_2m)}°C</p>
              <p className="text-gray-400 text-sm mt-1">
                💨 {Math.round(weather.wind_speed_10m)} km/h &nbsp;·&nbsp; 💧 {weather.relative_humidity_2m}%
              </p>
            </div>
            {score && (
              <div className={`rounded-xl px-3 py-2 border text-center min-w-[90px] ${score.bg}`}>
                <p className="text-xs text-gray-400 mb-1">Angel-Prognose</p>
                <p className={`font-bold text-sm ${score.color}`}>{score.label}</p>
              </div>
            )}
          </div>
          {score && (
            <div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${score.bar}`} style={{ width: `${score.pct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-900/80 p-5 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Fänge gesamt</p>
          <p className="text-3xl font-bold text-white mt-1">{catches.length}</p>
        </div>
        <div className="rounded-2xl bg-gray-900/80 p-5 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Heute</p>
          <p className="text-3xl font-bold text-white mt-1">{todayCount}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/app/chat', label: '🤖 KI-Chat', desc: 'Frag den Experten' },
          { to: '/app/log', label: '📖 Fangbuch', desc: 'Fang eintragen' },
          { to: '/app/map', label: '🗺️ Karte', desc: 'Spots entdecken' },
          { to: '/app/community', label: '👥 Community', desc: 'Wettbewerbe' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <p className="font-semibold text-white text-sm">{label}</p>
            <p className="text-gray-500 text-xs mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Letzte Fänge */}
      {catches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Letzte Fänge</h2>
          <div className="space-y-2">
            {catches.slice(0, 3).map(c => (
              <div key={c.id} className="rounded-xl bg-gray-900/80 p-4 border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{c.species || 'Unbekannt'}</p>
                  <p className="text-gray-500 text-xs">{c.length_cm && `${c.length_cm}cm`}{c.length_cm && c.weight_kg && ' · '}{c.weight_kg && `${c.weight_kg}kg`}</p>
                </div>
                <p className="text-gray-600 text-xs">{new Date(c.catch_time).toLocaleDateString('de-DE')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
