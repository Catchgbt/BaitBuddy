import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WakeWordIndicator from "@/components/header/WakeWordIndicator";
import MiniKarte from "@/components/home/MiniKarte";
import WeatherRadarMap from "@/components/weather/WeatherRadarMap";
import MiniKiVoiceBuddy from "@/components/home/MiniKiVoiceBuddy";
import SchonzeitWarner from "@/components/dashboard/SchonzeitWarner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cacheEntityData, cacheWeatherData, getCachedWeather, getOfflineData, initOfflineDB } from "@/components/utils/OfflineDataCache";
import OfflineCacheIndicator from "@/components/dashboard/OfflineCacheIndicator";
import FishingRecommendationCard from "@/components/dashboard/FishingRecommendationCard";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictivePrefetch } from "@/hooks/usePredictivePrefetch";
import PageContainer from "@/components/layout/PageContainer";
import VoiceOverlay from "@/components/layout/VoiceOverlay";
import CommunityPostDialog from "@/components/community/CommunityPostDialog";

export default function Dashboard() {
  const queryClient = useQueryClient();
  usePredictivePrefetch('Dashboard');
  const [user, setUser] = useState(null);
  const statusAnnouncementRef = React.useRef(null);
  const [weather, setWeather] = useState(null);
  const [nearestSpot, setNearestSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState({
    isActive: false,
    mode: null,
    isListening: false,
    error: null
  });
  const [buttonPulse, setButtonPulse] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showCommunityDialog, setShowCommunityDialog] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const cleanupSessions = async () => {
      try {
        await base44.functions.invoke('cleanupOldSessions');
      } catch (error) {
        console.log('Session cleanup (ignoriert):', error.message);
      }
    };
    
    cleanupSessions();
    loadData();

    const handleVoiceStatusUpdate = (event) => {
      if (event.detail) {
        setVoiceStatus(event.detail);
      }
    };

    window.addEventListener('wake-word-status-change', handleVoiceStatusUpdate);

    const handleWakeWordDetected = () => {
      setButtonPulse(true);
      setTimeout(() => setButtonPulse(false), 1000);
    };

    window.addEventListener('wake-word-detected', handleWakeWordDetected);

    const handleVoiceTranscript = (event) => {
      if (event.detail) {
        setVoiceTranscript(event.detail);
      }
    };

    window.addEventListener('voice-transcript', handleVoiceTranscript);

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
      window.removeEventListener('wake-word-status-change', handleVoiceStatusUpdate);
      window.removeEventListener('wake-word-detected', handleWakeWordDetected);
      window.removeEventListener('voice-transcript', handleVoiceTranscript);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let spots = await base44.entities.Spot.list('', 100).catch(() => []);
      
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
          console.warn('Location parse error:', parseError);
        }
      }

      if (!userLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation = {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            };
            localStorage.setItem("fm_current_location", JSON.stringify(userLocation));
          },
          (error) => console.warn('Geolocation error:', error),
          { timeout: 5000 }
        );
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
          const weatherPromise = fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`
          ).then(res => res.json()).catch(() => null);

          weatherData = await weatherPromise;
          
          // Cache frische Wetterdaten
          if (weatherData && weatherData.current) {
            await cacheWeatherData(userLocation.lat, userLocation.lon, weatherData.current);
          }
        }
        
        if (weatherData && weatherData.current) {
          setWeather(weatherData.current);
        } else if (weatherData && weatherData.temperature_2m !== undefined) {
          setWeather(weatherData);
        }

        if (spots.length > 0) {
          let nearest = null;
          let minDist = 999999;
          
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
              
              if (dist < minDist) {
                minDist = dist;
                nearest = { ...spot, distance: dist };
              }
            }
          });
          
          if (nearest) {
            setNearestSpot(nearest);
          }
        }
      } else if (spots.length > 0) {
        setNearestSpot(spots[0]);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
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
          console.error('Location parse error:', e);
        }
      }

      if (!location || !location.lat || !location.lon) {
        toast.error("Kein Standort verfuegbar. Bitte Standort aktivieren.");
        setIsAnalyzing(false);
        return;
      }

      const weatherData = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=temperature_2m,precipitation_probability&timezone=auto&forecast_days=1`
      ).then(res => res.json());

      const prompt = `Du bist ein erfahrener Angel-Experte und Geografie-Assistent.

AUFGABE: Pruefe zuerst, ob sich der Angler an einem Gewaesser befindet oder ob sich in der naeheren Umgebung (bis ca. 1 km) ein Gewaesser (See, Fluss, Teich, Kanal, Bach, etc.) befindet. Nutze dazu das Internet und OpenStreetMap-Daten fuer die genauen Koordinaten.

Standortkoordinaten: Breitengrad ${location.lat.toFixed(5)}, Laengengrad ${location.lon.toFixed(5)}

Wetterbedingungen:
- Temperatur: ${weatherData.current?.temperature_2m}°C
- Luftfeuchtigkeit: ${weatherData.current?.relative_humidity_2m}%
- Luftdruck: ${weatherData.current?.surface_pressure} hPa
- Windgeschwindigkeit: ${weatherData.current?.wind_speed_10m} m/s
- Windrichtung: ${weatherData.current?.wind_direction_10m}°
- Bewoelkung: ${weatherData.current?.cloud_cover}%
- Niederschlag: ${weatherData.current?.precipitation} mm

WICHTIGE REGELN:
- Wenn KEIN Gewaesser innerhalb von 1 km gefunden wird: Teile dem Angler klar mit, dass er aktuell NICHT an einem Gewaesser ist und daher keine sinnvollen Angel-Tipps gegeben werden koennen. Nenne die naechsten bekannten Gewaesser in der Region und deren ungefaehre Entfernung.
- Wenn ein Gewaesser GEFUNDEN wird: Nenne den Namen des Gewaessers, die Entfernung, und gib dann konkrete Angel-Tipps fuer genau dieses Gewaesser basierend auf den aktuellen Wetterbedingungen (Fischarten, Koeder, Taktik, beste Uhrzeit).

Antworte auf Deutsch, klar und direkt, ohne Floskeln, in max 6 Saetzen.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true
      });

      setAiAnalysis(response);
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
        <div className="text-cyan-400 text-sm">Laden...</div>
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
      
      <VoiceOverlay 
        isOpen={voiceOverlayOpen} 
        onClose={() => setVoiceOverlayOpen(false)} 
        currentPageName="Dashboard" 
      />

      <div className="space-y-12">

        <div className="flex items-center justify-between border-b border-gray-800/50 pb-6">
          <Button
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analysiere...</span>
              </>
            ) : (
              <span>KI Standort-Analyse</span>
            )}
          </Button>
          
          <div className="flex flex-col items-end gap-2">
            <OfflineCacheIndicator />
            <button
              onClick={() => setVoiceOverlayOpen(true)}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 hover:border-cyan-400/50 transition-all min-h-[44px] min-w-[44px] ${
                buttonPulse ? 'animate-pulse ring-2 ring-cyan-400' : ''
              }`}
            >
              <div className="text-xs text-gray-400 hidden sm:block">KI-Voice</div>
              <WakeWordIndicator 
                isActive={voiceStatus.isActive}
                mode={voiceStatus.mode}
                isListening={voiceStatus.isListening}
                error={voiceStatus.error}
                showAlways={true}
              />
            </button>
            {voiceTranscript && (
              <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-900/30 rounded-lg px-4 py-2 border-2 border-cyan-500/60 shadow-lg shadow-cyan-500/20 w-full max-w-sm">
                <p className="text-sm text-cyan-200 font-medium break-words">{voiceTranscript}</p>
              </div>
            )}
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

        <div>
          <MiniKiVoiceBuddy />
        </div>

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
                  <div className="flex items-baseline gap-2 sm:gap-3">
                    <span className="text-4xl sm:text-6xl font-bold text-white tracking-tight" aria-label={`Temperatur: ${Math.round(weather.temperature_2m)} Grad Celsius`}>{Math.round(weather.temperature_2m)}</span>
                    <span className="text-2xl sm:text-3xl text-gray-400">C</span>
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
              <h3 className="text-sm font-semibold text-emerald-400/70 uppercase tracking-wider mb-4 sm:mb-6">Naechster Spot</h3>
              {nearestSpot ? (
                <div className="space-y-3" role="region" aria-live="polite" aria-atomic="false" aria-label="Naechster Angelspot: Name, Gewassertyp, Entfernung">
                  <div className="text-xl sm:text-2xl font-bold text-white" aria-label={`Spotname: ${nearestSpot.name}`}>{nearestSpot.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400 capitalize" aria-label={`Gewassertyp: ${nearestSpot.water_type}`}>{nearestSpot.water_type}</div>
                  {nearestSpot.distance && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-800/50" aria-label={`Entfernung: ${nearestSpot.distance < 1 ? Math.round(nearestSpot.distance * 1000) + ' Meter' : nearestSpot.distance.toFixed(1) + ' Kilometer'}`}>
                      {nearestSpot.distance < 1 
                        ? `${Math.round(nearestSpot.distance * 1000)}m entfernt`
                        : `${nearestSpot.distance.toFixed(1)}km entfernt`
                      }
                    </div>
                  )}
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

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm p-6 sm:p-8 border border-gray-800/50">
          <h3 className="text-sm font-semibold text-cyan-400/70 uppercase tracking-wider mb-4">Wetterradar</h3>
          <div className="h-96">
            <WeatherRadarMap />
          </div>
        </div>

        <FishingRecommendationCard />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Schnellzugriff</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {[
              { name: "Karte", path: "Map", offline: true },
              { name: "Wetter", path: "Weather", offline: true },
              { name: "Fangbuch", path: "Logbook", offline: true },
              { name: "Fang-Uebersicht", path: "CatchStats" },
              { name: "KI-Chat", path: "AIAssistant" },
              { name: "KI-Cam", path: "AI" },
              { name: "Gewaesser (C)", path: "WaterAnalysis", offline: true },
              { name: "Gear", path: "Gear", offline: true },
              { name: "Trips", path: "TripPlanner" },
              { name: "Community (C)", path: "Community" },
              { name: "Ranking", path: "Ranking" },
              { name: "Angelschein", path: "AngelscheinPruefungSchonzeiten", offline: true }
            ].map((feature) => (
              feature.path === "Community" ? (
                <button
                  key={feature.path}
                  onClick={() => setShowCommunityDialog(true)}
                  className="group relative overflow-hidden rounded-xl bg-gray-900/50 hover:bg-gray-800/60 border border-gray-800/50 hover:border-gray-700/60 p-5 text-center transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="text-sm font-medium text-gray-300 group-hover:text-cyan-400 transition-colors">{feature.name}</div>
                  </div>
                </button>
              ) : (
                <Link
                  key={feature.path}
                  to={createPageUrl(feature.path)}
                  className="group relative overflow-hidden rounded-xl bg-gray-900/50 hover:bg-gray-800/60 border border-gray-800/50 hover:border-gray-700/60 p-5 text-center transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="text-sm font-medium text-gray-300 group-hover:text-cyan-400 transition-colors">{feature.name}</div>
                    {feature.offline && (
                      <div className="text-xs text-emerald-400 mt-1">Offline verfuegbar</div>
                    )}
                  </div>
                </Link>
              )
            ))}
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