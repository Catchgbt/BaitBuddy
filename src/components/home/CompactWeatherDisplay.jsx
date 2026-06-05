import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "@/components/location/LocationManager";
import { Wind, Activity, Cloud, Droplets, Sun, CloudRain, MapPin } from "lucide-react";
import { User } from "@/entities/User";

const compactCacheKey = (lat, lon) => {
  const hour = new Date().toISOString().slice(0, 13);
  return `weather_compact_${lat.toFixed(2)}_${lon.toFixed(2)}_${hour}`;
};

function CompactWeatherDisplay() {
  const { currentLocation } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertSettings, setAlertSettings] = useState(null);
  const [alertsChecked, setAlertsChecked] = useState(false);

  useEffect(() => {
    loadAlertSettings();
    
    // Listen for settings updates
    const handleAlertsUpdate = (event) => {
      setAlertSettings(event.detail);
      setAlertsChecked(false); // Re-check alerts with new settings
    };
    
    window.addEventListener('weather-alerts-updated', handleAlertsUpdate);
    
    return () => {
      window.removeEventListener('weather-alerts-updated', handleAlertsUpdate);
    };
  }, []);

  const loadAlertSettings = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.weather_alerts) {
        setAlertSettings(user.settings.weather_alerts);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Alarm-Einstellungen:", error);
    }
  };

  const checkWeatherAlerts = useCallback((weatherData) => {
    if (!alertSettings || alertsChecked) return;
    
    const alerts = [];
    
    // Regenwarnung
    if (alertSettings.rain_alert_enabled && weatherData.hourly?.precipitation_probability) {
      const maxRainProb = Math.max(...weatherData.hourly.precipitation_probability.slice(0, 12));
      if (maxRainProb >= alertSettings.rain_probability_threshold) {
        alerts.push({
          type: 'rain',
          message: `Regenwarnung! ${Math.round(maxRainProb)}% Regenwahrscheinlichkeit in den nächsten Stunden.`,
          icon: '🌧️'
        });
      }
    }
    
    // Windwarnung
    if (alertSettings.wind_alert_enabled && weatherData.current?.wind_speed_10m) {
      if (weatherData.current.wind_speed_10m >= alertSettings.wind_speed_threshold) {
        alerts.push({
          type: 'wind',
          message: `Windwarnung! Aktuell ${Math.round(weatherData.current.wind_speed_10m)} m/s Wind.`,
          icon: '💨'
        });
      }
    }
    
    // Sturmwarnung
    if (alertSettings.storm_alert_enabled && weatherData.current?.wind_gusts_10m) {
      if (weatherData.current.wind_gusts_10m >= alertSettings.storm_gust_threshold) {
        alerts.push({
          type: 'storm',
          message: `Sturmwarnung! Windböen bis ${Math.round(weatherData.current.wind_gusts_10m)} m/s.`,
          icon: '⚠️'
        });
      }
    }
    
    // Temperaturwarnung
    if (alertSettings.temp_alert_enabled && weatherData.current?.temperature_2m) {
      const temp = weatherData.current.temperature_2m;
      if (temp <= alertSettings.temp_low_threshold) {
        alerts.push({
          type: 'temp_low',
          message: `Kältewarnung! Nur ${Math.round(temp)}°C. Warme Kleidung empfohlen.`,
          icon: '🥶'
        });
      } else if (temp >= alertSettings.temp_high_threshold) {
        alerts.push({
          type: 'temp_high',
          message: `Hitzewarnung! ${Math.round(temp)}°C. Ausreichend trinken!`,
          icon: '🥵'
        });
      }
    }

    // UV-Index Warnung
    if (alertSettings.uv_alert_enabled && weatherData.daily?.uv_index_max?.[0]) {
      const uvIndex = weatherData.daily.uv_index_max[0];
      if (uvIndex >= alertSettings.uv_index_threshold) {
        alerts.push({
          type: 'uv',
          message: `UV-Warnung! UV-Index ${uvIndex}. Sonnenschutz verwenden!`,
          icon: '☀️'
        });
      }
    }

    // Sichtweiten-Warnung (Nebel)
    if (alertSettings.visibility_alert_enabled && weatherData.current?.visibility) {
      const visibilityKm = weatherData.current.visibility / 1000;
      if (visibilityKm <= alertSettings.visibility_threshold_km) {
        alerts.push({
          type: 'visibility',
          message: `Nebelwarnung! Sichtweite nur ${visibilityKm.toFixed(1)} km.`,
          icon: '🌫️'
        });
      }
    }

    // Taupunkt-Warnung
    if (alertSettings.dewpoint_alert_enabled && weatherData.current?.temperature_2m && weatherData.current?.dew_point_2m) {
      const tempDiff = Math.abs(weatherData.current.temperature_2m - weatherData.current.dew_point_2m);
      if (tempDiff <= alertSettings.dewpoint_diff_threshold) {
        alerts.push({
          type: 'dewpoint',
          message: `Hohe Luftfeuchtigkeit! Taupunkt bei ${Math.round(weatherData.current.dew_point_2m)}°C - Nebel möglich.`,
          icon: '💧'
        });
      }
    }
    
    // Zeige Warnungen als Toast
    alerts.forEach(alert => {
      import('sonner').then(({ toast }) => {
        toast.warning(alert.message, {
          icon: alert.icon,
          duration: 5000
        });
      });
    });
    
    setAlertsChecked(true);
  }, [alertSettings, alertsChecked]);

  const load = useCallback(async (lat, lon) => {
    setLoading(true);
    const key = compactCacheKey(lat, lon);
    const cached = localStorage.getItem(key);
    
    if (cached) { 
      try {
        const parsedData = JSON.parse(cached);
        setData(parsedData); 
        setLoading(false); 
        // When loading from cache, 'data' object may not contain all fields needed for alerts
        // (e.g., full hourly array, daily array).
        // Alerts will be re-checked after a fresh API fetch, which will be triggered if
        // the cache is expired or location changes (resetting alertsChecked).
        return;
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
    
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,pressure_msl,weather_code,relative_humidity_2m,apparent_temperature,visibility,wind_gusts_10m,dew_point_2m&hourly=cloud_cover,precipitation_probability&daily=sunrise,sunset,uv_index_max&timezone=auto`;
      const res = await fetch(url);
      const json = await res.json();
      
      const current = {
        temperature: json?.current?.temperature_2m,
        wind: json?.current?.wind_speed_10m,
        pressure: json?.current?.pressure_msl,
        humidity: json?.current?.relative_humidity_2m,
        apparent: json?.current?.apparent_temperature,
        visibility: json?.current?.visibility,
        weatherCode: json?.current?.weather_code,
        wind_gusts_10m: json?.current?.wind_gusts_10m,
        dew_point_2m: json?.current?.dew_point_2m, // Added for dew point alert
        sunrise: json?.daily?.sunrise?.[0],
        sunset: json?.daily?.sunset?.[0],
        uvIndex: json?.daily?.uv_index_max?.[0],
        cloudCover: json?.hourly?.cloud_cover?.[0],
        precipitationProb: json?.hourly?.precipitation_probability?.[0]
      };
      
      localStorage.setItem(key, JSON.stringify(current));
      setData(current);
      
      // Prüfe Wetter-Alarme mit der vollständigen API-Antwort
      if (alertSettings) {
        checkWeatherAlerts({
          current: json.current, // Pass the raw current data from API for specific fields
          hourly: json.hourly, // Pass the full hourly data for checks like precipitation_probability
          daily: json.daily // Pass the full daily data for checks like uv_index_max
        });
      }
    } catch (error) {
      console.error("Wetter-API Fehler:", error);
    }
    setLoading(false);
  }, [alertSettings, alertsChecked, checkWeatherAlerts]);

  useEffect(() => {
    if (currentLocation?.lat && currentLocation?.lon) {
      load(currentLocation.lat, currentLocation.lon);
    }
  }, [currentLocation, load]);

  // Reset alerts checked when location changes
  useEffect(() => {
    setAlertsChecked(false);
  }, [currentLocation]);

  const getWeatherIcon = (code) => {
    if (code === null || code === undefined) return <Activity className="w-5 h-5 text-gray-300" />;
    if ([0, 1].includes(code)) return <Sun className="w-5 h-5 text-yellow-400" />;
    if ([2, 3].includes(code)) return <Cloud className="w-5 h-5 text-gray-300" />;
    return <CloudRain className="w-5 h-5 text-blue-400" />;
  };

  const getWeatherDescription = (code) => {
    if ([0, 1].includes(code)) return "Sonnig";
    if ([2, 3].includes(code)) return "Bewölkt";
    if ([45, 48].includes(code)) return "Nebelig";
    if ([51, 53, 55].includes(code)) return "Nieselig";
    if ([61, 63, 65].includes(code)) return "Regnerisch";
    return "Wechselhaft";
  };

  const getFishingCondition = () => {
    if (!data) return { text: "Bewertung lädt...", color: "text-gray-400" };
    
    let score = 0;
    let reasons = [];
    
    // Luftdruck bewerten
    if (data.pressure > 1020) {
      score += 2;
      reasons.push("Hoher Luftdruck");
    } else if (data.pressure < 1000) {
      score -= 1;
      reasons.push("Tiefer Luftdruck");
    } else {
      score += 1;
    }
    
    // Wind bewerten
    if (data.wind > 25) {
      score -= 1;
      reasons.push("Starker Wind");
    } else if (data.wind < 10) {
      score += 1;
      reasons.push("Schwacher Wind");
    }
    
    // Bewölkung bewerten (prüfen ob cloudCover existiert)
    if (data.cloudCover && data.cloudCover > 70) {
      score += 1;
      reasons.push("Stark bewölkt");
    }
    
    if (score >= 3) return { text: "Sehr gut", color: "text-green-400" };
    if (score >= 1) return { text: "Gut", color: "text-emerald-400" };
    if (score >= 0) return { text: "Mittel", color: "text-yellow-400" };
    return { text: "Schwierig", color: "text-red-400" };
  };

  if (loading || !data) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="text-gray-400 text-center">Wetter wird geladen...</div>
      </div>
    );
  }

  const condition = getFishingCondition();
  const locationName = currentLocation?.name || "Unbekannt";

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          {getWeatherIcon(data.weatherCode)}
          <span className="font-semibold text-lg">{Math.round(data.temperature)}°C</span>
          <span className="text-gray-300 text-sm">{getWeatherDescription(data.weatherCode)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400">{String(locationName).slice(0, 15)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3 text-center text-xs mb-3">
        <div>
          <Wind className="w-4 h-4 mx-auto mb-1 text-gray-400" />
          <div className="text-white font-medium">{Math.round(data.wind)}</div>
          <div className="text-gray-400">km/h</div>
        </div>
        <div>
          <Activity className="w-4 h-4 mx-auto mb-1 text-gray-400" />
          <div className="text-white font-medium">{Math.round(data.pressure)}</div>
          <div className="text-gray-400">hPa</div>
        </div>
        <div>
          <Droplets className="w-4 h-4 mx-auto mb-1 text-gray-400" />
          <div className="text-white font-medium">{data.humidity}%</div>
          <div className="text-gray-400">Feuchte</div>
        </div>
        <div>
          <Cloud className="w-4 h-4 mx-auto mb-1 text-gray-400" />
          <div className="text-white font-medium">{data.precipitationProb || 0}%</div>
          <div className="text-gray-400">Regen</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
        <div className="text-xs text-gray-400">
          Gefühlte {Math.round(data.apparent)}°C • Sicht {(data.visibility/1000).toFixed(1)}km
        </div>
        <div className={`text-xs font-medium ${condition.color} drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]`}>
          Angel-Bedingungen: {condition.text}
        </div>
      </div>
    </div>
  );
}

export default React.memo(CompactWeatherDisplay, (prevProps, nextProps) => {
  // Re-render only if location changed significantly (at least 0.1 degrees)
  return (
    Math.abs((prevProps.currentLocation?.lat || 0) - (nextProps.currentLocation?.lat || 0)) < 0.1 &&
    Math.abs((prevProps.currentLocation?.lon || 0) - (nextProps.currentLocation?.lon || 0)) < 0.1
  );
});