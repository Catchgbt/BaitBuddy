import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

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
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`);
        const d = await r.json();
        if (d.current) setWeather(d.current);
      } catch {}
    });
  }, []);

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Angler';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? `Guten Morgen, ${name}` : hour < 18 ? `Hallo, ${name}` : `Guten Abend, ${name}`;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">{greeting}</h1>

      {/* Wetter */}
      {weather && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-900/40 to-cyan-900/20 p-5 border border-blue-800/30">
          <p className="text-xs text-cyan-400/70 uppercase tracking-wider mb-2">Aktuelles Wetter</p>
          <p className="text-4xl font-bold text-white">{Math.round(weather.temperature_2m)}°C</p>
          <p className="text-gray-400 text-sm mt-1">Wind: {Math.round(weather.wind_speed_10m)} m/s</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-900/80 p-5 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Fänge</p>
          <p className="text-3xl font-bold text-white mt-1">{catchesData?.catches?.length || 0}</p>
        </div>
        <div className="rounded-2xl bg-gray-900/80 p-5 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Heute</p>
          <p className="text-3xl font-bold text-white mt-1">
            {catchesData?.catches?.filter(c => new Date(c.catch_time).toDateString() === new Date().toDateString()).length || 0}
          </p>
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
      {catchesData?.catches?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Letzte Fänge</h2>
          <div className="space-y-2">
            {catchesData.catches.slice(0, 3).map(c => (
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
