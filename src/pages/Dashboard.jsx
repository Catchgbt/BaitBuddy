import React, { useState, useEffect } from "react";
import { integrations } from "@/api/frontendClient";
import { functions } from "@/api/frontendClient";
import { Spot } from "@/entities/Spot";
import { auth } from "@/api/auth";
import { useAITTS } from "@/hooks/useAITTS";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import VoiceControlWidget from "@/components/dashboard/VoiceControlWidget";
import MiniKarte from "@/components/home/MiniKarte";
import { Brain, Mic, BookOpen, ArrowRight, MapPin, Cloud, BarChart2, MessageCircle, Camera, Waves, Wrench, Calendar, Users, Trophy, GraduationCap, Loader2 } from "lucide-react";
import SchonzeitWarner from "@/components/dashboard/SchonzeitWarner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cacheEntityData, cacheWeatherData, getCachedWeather, getOfflineData } from "@/components/utils/offlineDataCache";
import OfflineCacheIndicator from "@/components/dashboard/OfflineCacheIndicator";
import FishingRecommendationCard from "@/components/dashboard/FishingRecommendationCard";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictivePrefetch } from "@/hooks/usePredictivePrefetch";
import PageContainer from "@/components/layout/PageContainer";
import CommunityPostDialog from "@/components/community/CommunityPostDialog";

export default function Dashboard() {
  const queryClient = useQueryClient();
  usePredictivePrefetch('Dashboard');
  const { speak } = useAITTS();
  const [user, setUser] = useState(null);
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const statusAnnouncementRef = React.useRef(null);
  const [weather, setWeather] = useState(null);
  const [nearestSpots, setNearestSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCommunityDialog, setShowCommunityDialog] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Begrüße Nutzer mit KI-Stimme bei Dashboard-Einstieg
  useEffect(() => {
    if (user && user.full_name && !greetingPlayed && speak) {
      setGreetingPlayed(true);
      const firstName = user.full_name.split(' ')[0];
      const greetings = [
        `Willkommen zurück, ${firstName}. Viel Erfolg beim Angeln heute.`,
        `Hallo ${firstName}, schön dich wiederzusehen. Petri Heil für heute.`,
        `${firstName}, schön dich zu sehen. Die Fische warten schon.`,
        `Willkommen, ${firstName}. Heute könnte dein bester Fangtag werden.`
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setTimeout(() => {
        speak(greeting, { rate: 0.9, pitch: 1 });
      }, 500);
    }
  }, [user, greetingPlayed, speak]);

  useEffect(() => {
    const cleanupSessions = async () => {
      try {
        await functions.invoke('cleanupOldSessions');
      } catch (error) {
        // Session cleanup errors are non-critical
      }
    };
    
    cleanupSessions();
    loadData();

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        setPullStart(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (pullStart > 0) {
        const distance = e.touches[0].clientY - pullStart;
        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 80) {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
      }
      setPullStart(0);
      setPullDistance(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);

      let spots = await Spot.list('', 100).catch(() => []);
      
      // Cache Spots wenn online
      if (spots.length > 0 && navigator.onLine) {
        await cacheEntityData('spots', spots);
      } else if (spots.length === 0) {
        // Fallback zu gecachten Spots wenn offline
        spots = await getOfflineData('spots');
      }

      let userLocation = null;
      const savedLocation = localStorage.getItem("fm_current_location");

      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation);
          if (location && location.lat != null && location.lon != null) {
            userLocation = { lat: location.lat, lon: location.lon };
          }
        } catch (parseError) {
        }
      }

      // Versuche frische Geolokation nur wenn keine gespeicherte vorhanden
      if (!userLocation && navigator.geolocation) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                userLocation = {
                  lat: position.coords.latitude,
                  lon: position.coords.longitude
                };
                localStorage.setItem("fm_current_location", JSON.stringify(userLocation));
                resolve();
              },
              reject,
              { timeout: 5000, maximumAge: 300000 }
            );
          });
        } catch (error) {
          // Geolocation fallback to cached location
        }
      }

      if (userLocation) {
        let weatherData = null;

        // Versuche gecachtes Wetter zu laden
        if (!navigator.onLine) {
          const cachedWeather = await getCachedWeather(userLocation.lat, userLocation.lon);
          if (cachedWeather) {
            weatherData = cachedWeather;
          }
        } else {
          // Hole frische Daten online
          try {
            const weatherPromise = fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`
            ).then(res => res.json()).catch(() => null);

            weatherData = await weatherPromise;

            // Cache frische Wetterdaten
            if (weatherData && weatherData.current) {
              await cacheWeatherData(userLocation.lat, userLocation.lon, weatherData.current);
            }
          } catch (error) {
            // Weather fetch error - will use cached data
          }
        }

        if (weatherData && weatherData.current) {
          setWeather(weatherData.current);
        } else if (weatherData && weatherData.temperature_2m !== undefined) {
          setWeather(weatherData);
        }

        if (spots.length > 0) {
          const spotsWithDist = [];

          spots.forEach(spot => {
            if (spot.latitude != null && spot.longitude != null) {
              const R = 6371;
              const dLat = (spot.latitude - userLocation.lat) * Math.PI / 180;
              const dLon = (spot.longitude - userLocation.lon) * Math.PI / 180;
              const a =
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(spot.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const dist = R * c;
              spotsWithDist.push({ ...spot, distance: dist });
            }
          });

          spotsWithDist.sort((a, b) => a.distance - b.distance);
          const topTwo = spotsWithDist.slice(0, 2);
          if (topTwo.length > 0) {
            setNearestSpots(topTwo);
          }
        }
      } else if (spots.length > 0) {
        setNearestSpots(spots.slice(0, 2));
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getWeatherDesc = (code) => {
    if ([0, 1].includes(code)) return "Sonnig";
    if ([2, 3].includes(code)) return "Bewoelkt";
    if ([45, 48].includes(code)) return "Nebel";
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "Regen";
    return "Wechselhaft";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.nickname || user?.full_name?.split(' ')[0] || "Angler";
    
    const morningGreetings = [
      `Guten Morgen, ${name}`,
      `Moin ${name}`,
      `Einen schoenen Morgen, ${name}`,
      `Frueh auf den Beinen, ${name}`,
      `Der fruehe Angler faengt den Fisch, ${name}`
    ];
    
    const afternoonGreetings = [
      `Guten Tag, ${name}`,
      `Hallo ${name}`,
      `Willkommen zurueck, ${name}`,
      `Schoen dich zu sehen, ${name}`,
      `Perfekt fuer eine Angelsession, ${name}`
    ];
    
    const eveningGreetings = [
      `Guten Abend, ${name}`,
      `Nabend ${name}`,
      `Zeit fuer die Abendaemmerung, ${name}`,
      `Die besten Bisse kommen jetzt, ${name}`,
      `Bereit fuer die Nachtangelei, ${name}`
    ];
    
    let greetings;
    if (hour >= 5 && hour < 12) greetings = morningGreetings;
    else if (hour >= 12 && hour < 18) greetings = afternoonGreetings;
    else if (hour >= 18 && hour < 22) greetings = eveningGreetings;
    else greetings = [`Hallo, ${name}`];
    
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const savedLocation = localStorage.getItem("fm_current_location");
      let location = null;
      
      if (savedLocation) {
        try {
          location = JSON.parse(savedLocation);
        } catch (e) {
        }
      }

      if (!location || !location.lat || !location.lon) {
        toast.error("Kein Standort verfuegbar. Bitte Standort aktivieren.");
        setIsAnalyzing(false);
        return;
      }

      const [weatherData, osmData] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&timezone=auto`
        ).then(r => r.json()).catch(() => null),
        fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `[out:json][timeout:10];(way["natural"="water"](around:1500,${location.lat},${location.lon});way["waterway"~"river|stream|canal"](around:1500,${location.lat},${location.lon});relation["natural"="water"](around:1500,${location.lat},${location.lon}););out center 8;`
        }).then(r => r.json()).catch(() => null)
      ]);

      const waterBodies = osmData?.elements
        ?.filter(el => el.tags?.name)
        ?.map(el => {
          const dlat = (el.center?.lat || el.lat || location.lat) - location.lat;
          const dlon = (el.center?.lon || el.lon || location.lon) - location.lon;
          const distM = Math.round(Math.sqrt(dlat * dlat + dlon * dlon) * 111320);
          const type = el.tags?.waterway ? `Fließgewässer (${el.tags.waterway})` : 'Stillgewässer';
          return `${el.tags.name} (${type}, ca. ${distM < 1000 ? distM + ' m' : (distM / 1000).toFixed(1) + ' km'})`;
        }) || [];

      const gewaesserInfo = waterBodies.length > 0
        ? `Gefundene Gewässer in der Nähe (aus OpenStreetMap):\n${waterBodies.slice(0, 5).map(w => `- ${w}`).join('\n')}`
        : 'Laut OpenStreetMap wurden innerhalb von 1,5 km KEINE benannten Gewässer gefunden.';

      const wetter = weatherData?.current;
      const prompt = `Du bist ein erfahrener Angel-Experte.

Standort des Anglers: ${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}

${gewaesserInfo}

Aktuelle Wetterbedingungen:
- Temperatur: ${wetter?.temperature_2m ?? '?'}°C
- Luftfeuchtigkeit: ${wetter?.relative_humidity_2m ?? '?'}%
- Luftdruck: ${wetter?.surface_pressure ?? '?'} hPa
- Wind: ${wetter?.wind_speed_10m ?? '?'} m/s aus ${wetter?.wind_direction_10m ?? '?'}°
- Bewölkung: ${wetter?.cloud_cover ?? '?'}%
- Niederschlag: ${wetter?.precipitation ?? '?'} mm

Aufgabe: ${waterBodies.length > 0
  ? 'Nenne das nächste Gewässer und gib konkrete Angel-Tipps für genau dieses Gewässer basierend auf den Wetterbedingungen (Fischarten, Köder, Taktik, beste Uhrzeit).'
  : 'Teile dem Angler mit, dass er gerade nicht an einem Gewässer ist. Nenne die nächsten bekannten Angelgewässer der Region und grobe Entfernung.'}

Antworte auf Deutsch, direkt und praxisnah, in max 6 Sätzen.`;

      const response = await integrations.Core.InvokeLLM({ prompt });
      const analysisText = typeof response === 'string'
        ? response
        : response?.reply || response?.message || response || 'Keine Analyse verfügbar.';

      setAiAnalysis(analysisText);
      setShowAnalysis(true);
      if (statusAnnouncementRef?.current) {
        statusAnnouncementRef.current.textContent = "KI-Analyse abgeschlossen";
      }
      toast.success("KI-Analyse abgeschlossen");
    } catch (error) {
      console.error("KI-Analyse Fehler:", error);
      if (statusAnnouncementRef?.current) {
        statusAnnouncementRef.current.textContent = "KI-Analyse fehlgeschlagen";
      }
      toast.error("KI-Analyse fehlgeschlagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <div className="text-cyan-400/70 text-sm font-medium tracking-wide">Dashboard lädt...</div>
        </div>
      </div>
    );
  }

    return (
    <PageContainer maxWidth="max-w-7xl" enableSwipeRefresh={true} onRefresh={loadData}>
      <div 
        ref={statusAnnouncementRef}
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      />
      
      <div className="space-y-6">

        <div className="flex items-center justify-between border-b border-gray-800/50 pb-5">
          <Button
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analysiere...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>KI Standort-Analyse</span>
              </>
            )}
          </Button>

          <div className="flex flex-col items-end gap-2">
            <OfflineCacheIndicator />
            <VoiceControlWidget />
          </div>
        </div>

        {showAnalysis && aiAnalysis && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm p-6 border border-purple-500/30 shadow-2xl" role="region" aria-live="assertive" aria-label="KI-Analyse Ergebnis">
            <button
              onClick={() => setShowAnalysis(false)}
              aria-label="Analyse schliessen"
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              X
            </button>
            <h3 className="text-lg font-bold text-purple-300 mb-4">KI Angel-Analyse</h3>
            <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              {aiAnalysis}
            </div>
          </div>
        )}

        <Link
          to={createPageUrl('KiBuddyBeta')}
          className="block relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900/30 via-gray-900/60 to-emerald-900/30 backdrop-blur-sm p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1">KI-Buddy CatchGBT</h3>
              <p className="text-sm text-gray-300 leading-snug">
                Frag mich alles rund ums Angeln — oder steuere die App per Voice!
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  <Mic className="w-3 h-3" /> "Mach einen Fangbuch-Eintrag"
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <BookOpen className="w-3 h-3" /> Tipps, Koeder, Wetter
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to={createPageUrl('Map')}
          className="block text-center py-3 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-400/40 transition-colors"
        >
          <p className="text-sm text-blue-400 underline underline-offset-4 decoration-blue-500/40">
            Entdecke auf der Karte neue Angelplaetze und plane deine Route direkt mit Google Maps
          </p>
        </Link>

        <SchonzeitWarner />

        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm p-6 sm:p-8 border border-gray-800/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <h3 className="text-sm font-semibold text-cyan-400/70 uppercase tracking-wider mb-4 sm:mb-6">Aktuelles Wetter</h3>
              {weather ? (
                <div className="space-y-3" role="region" aria-live="polite" aria-atomic="false" aria-label="Live Wetterdaten: Temperatur, Bedingung, Windgeschwindigkeit">
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-5xl sm:text-6xl font-bold text-white tracking-tight" aria-label={`Temperatur: ${Math.round(weather.temperature_2m)} Grad Celsius`}>{Math.round(weather.temperature_2m)}</span>
                    <span className="text-2xl sm:text-3xl text-cyan-400/80 font-light">°C</span>
                  </div>
                  <div className="text-base sm:text-lg text-gray-300" aria-label={`Wetterbedingung: ${getWeatherDesc(weather.weather_code)}`}>{getWeatherDesc(weather.weather_code)}</div>
                  <div className="text-xs sm:text-sm text-gray-500 pt-2 border-t border-gray-800/50" aria-label={`Windgeschwindigkeit: ${Math.round(weather.wind_speed_10m)} Meter pro Sekunde`}>Wind: {Math.round(weather.wind_speed_10m)} m/s</div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Keine Wetterdaten verfuegbar</div>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm p-6 sm:p-8 border border-gray-800/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <h3 className="text-sm font-semibold text-emerald-400/70 uppercase tracking-wider mb-4 sm:mb-6">Naechste Spots</h3>
              {nearestSpots.length > 0 ? (
                <div className="space-y-4" role="region" aria-live="polite" aria-atomic="false" aria-label="Naechste Angelspots">
                  {nearestSpots.map((spot, index) => (
                    <div key={spot.id} className="pb-4 last:pb-0 last:border-b-0 border-b border-gray-800/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-lg sm:text-xl font-bold text-white" aria-label={`Spot ${index + 1}: ${spot.name}`}>{spot.name}</div>
                          <div className="text-xs sm:text-sm text-gray-400 capitalize" aria-label={`Gewassertyp: ${spot.water_type}`}>{spot.water_type}</div>
                        </div>
                        <div className="text-xs font-medium text-emerald-300 whitespace-nowrap ml-2">
                          {spot.distance < 1
                            ? `${Math.round(spot.distance * 1000)}m`
                            : `${spot.distance.toFixed(1)}km`
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link to={createPageUrl('Map')} className="inline-block text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors pt-2">
                    Auf Karte anzeigen
                  </Link>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Spots auf Karte verfuegbar</div>
              )}
            </div>
          </div>
          </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm border border-gray-800/50">
          <MiniKarte />
        </div>


        <FishingRecommendationCard />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Schnellzugriff</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {[
              { name: "Karte", path: "Map", offline: true, Icon: MapPin, color: "text-blue-400", bg: "from-blue-500/10 to-blue-600/5" },
              { name: "Wetter", path: "Weather", offline: true, Icon: Cloud, color: "text-sky-400", bg: "from-sky-500/10 to-sky-600/5" },
              { name: "Fangbuch", path: "Logbook", offline: true, Icon: BookOpen, color: "text-cyan-400", bg: "from-cyan-500/10 to-cyan-600/5" },
              { name: "Statistik", path: "CatchStats", Icon: BarChart2, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-600/5" },
              { name: "KI-Chat", path: "AIAssistant", Icon: MessageCircle, color: "text-purple-400", bg: "from-purple-500/10 to-purple-600/5" },
              { name: "KI-Cam", path: "AI", Icon: Camera, color: "text-pink-400", bg: "from-pink-500/10 to-pink-600/5" },
              { name: "Gewässer", path: "WaterAnalysis", offline: true, Icon: Waves, color: "text-teal-400", bg: "from-teal-500/10 to-teal-600/5" },
              { name: "Ausrüstung", path: "GearV1", offline: true, Icon: Wrench, color: "text-orange-400", bg: "from-orange-500/10 to-orange-600/5" },
              { name: "Trips", path: "TripPlanner", Icon: Calendar, color: "text-amber-400", bg: "from-amber-500/10 to-amber-600/5" },
              { name: "Community", path: "Community", Icon: Users, color: "text-cyan-400", bg: "from-cyan-500/10 to-cyan-600/5" },
              { name: "Ranking", path: "Ranking", Icon: Trophy, color: "text-yellow-400", bg: "from-yellow-500/10 to-yellow-600/5" },
              { name: "Angelschein", path: "AngelscheinPruefungSchonzeiten", offline: true, Icon: GraduationCap, color: "text-indigo-400", bg: "from-indigo-500/10 to-indigo-600/5" }
            ].map((feature) => {
              const { Icon } = feature;
              const inner = (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative flex flex-col items-center gap-2">
                    <Icon className={`w-5 h-5 ${feature.color} group-hover:scale-110 transition-transform`} />
                    <div className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors leading-tight text-center">{feature.name}</div>
                    {feature.offline && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" title="Offline verfügbar" />
                    )}
                  </div>
                </>
              );
              return feature.path === "Community" ? (
                <button
                  key={feature.path}
                  onClick={() => setShowCommunityDialog(true)}
                  className="group relative overflow-hidden rounded-xl bg-gray-900/60 hover:bg-gray-800/70 border border-gray-800/50 hover:border-gray-700/70 p-4 text-center transition-all"
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={feature.path}
                  to={createPageUrl(feature.path)}
                  className="group relative overflow-hidden rounded-xl bg-gray-900/60 hover:bg-gray-800/70 border border-gray-800/50 hover:border-gray-700/70 p-4 text-center transition-all"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <CommunityPostDialog
        isOpen={showCommunityDialog}
        onOpenChange={setShowCommunityDialog}
      />
    </PageContainer>
    );
    }