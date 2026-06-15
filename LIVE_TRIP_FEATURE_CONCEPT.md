# BaitBuddy Live-Trip-Modus — Feature-Konzept

## Executive Summary

Der **Live-Trip-Modus** ist ein Premium-Feature, das Angler in Echtzeit mit wissenschaftlich fundierten Vorhersagen unterstützt. Durch die Kombination von **Gezeiten-Daten**, **Solunar-Zyklen** und **KI-gestützter historischer Analyse** bietet BaitBuddy eine Fähigkeit, die Konkurrenten wie Fishbrain und ANGLR nicht haben: **kontextbewusste Fangvorhersagen, die auf lokalen Bedingungen UND bisherigen Erfolgen basieren**.

---

## 1. Feature-Übersicht

### 1.1 Kernkomponenten

```
┌─────────────────────────────────────────────────────────┐
│              Live-Trip-Dashboard                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🗺️ GPS-Tracking        │  🌊 Gezeiten-Widget          │
│  • Aktive Tour-Route    │  • Echtzeit-Höhe             │
│  • Geschwindigkeit      │  • 7-Tage-Grafik             │
│  • Entfernung           │  • Prognose                  │
│                         │                              │
│  🌙 Solunar-Kalender    │  🎯 KI-Vorhersage            │
│  • Mondphase            │  • Optimale Zeiten           │
│  • Fresszeiten          │  • Artenspezifisch           │
│  • Score (1-100)        │  • Konfidenz-Level           │
│                         │                              │
│  📍 Spot-Empfehlungen   │  ⚙️ Live-Konfiguration       │
│  • Beste Angelplätze    │  • Fischarten-Filter         │
│  • in 5-20km Radius     │  • Köder-Empfehlungen        │
│  • Nach Bedingungen     │  • Alarm-Schwellen           │
│                         │                              │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Alleinstellungsmerkmale vs. Konkurrenz

| Feature | BaitBuddy Live-Trip | Fishbrain | ANGLR | Value |
|---------|-------------------|-----------|-------|-------|
| **Echtzeit-Gezeiten** | ✅ Hochauflösung | ⚠️ Basic | ⚠️ Basic | Genauere Vorhersagen |
| **Solunar-Integration** | ✅ Mit Mondphasen-UI | ❌ Nicht vorhanden | ⚠️ Nur Mondphase | Fesseln-orientiert |
| **KI-Fang-Vorhersage** | ✅ Historisch + Echtzeit | ❌ Nur Community | ⚠️ Nur Trends | Wissenschaftlich |
| **Offline-Trip-Data** | ✅ Vollständig | ❌ Nur Cache | ⚠️ Begrenzt | Unabhängigkeit |
| **Artenspezifische Prognosen** | ✅ Ja (12+ Arten) | ⚠️ Community-basiert | ⚠️ Begrenzt | Expertise |
| **Push bei Optima** | ✅ Echtzeit | ⚠️ Verzögert | ⚠️ Verzögert | Timing gewinnt Fische |

---

## 2. Detaillierte Feature-Spezifikation

### 2.1 GPS-Tracking

#### Funktionalität
```javascript
// Live-Trip-Session
{
  id: "trip_2026-06-13_weser",
  startedAt: "2026-06-13T06:30:00Z",
  location: {
    lat: 52.1234,
    lng: 9.5678,
    accuracy: 5, // Meter
    heading: 145, // Grad (NW)
    speed: 2.5, // km/h
  },
  route: [
    { lat, lng, timestamp, speed, catches: [] },
    // ... kontinuierliche Punkte alle 10 Sekunden
  ],
  stats: {
    totalDistance: 12.4, // km
    duration: "02:45", // hh:mm
    avgSpeed: 4.5, // km/h
    topSpeed: 12.3, // km/h
    catchCount: 7,
    catchRate: 2.5, // Fische/Stunde
  }
}
```

#### Besonderheiten
- **Intelligente Punkt-Sammlung**: Nur Punkte bei Bewegung (> 0.2 km/h) speichern
- **Offline-Speicherung**: GPX-Format im lokalen Storage, Upload bei Verbindung
- **Fang-Annotation**: Jeder Fang mit GPS-Position linked
- **Heatmap-Daten**: Positionen > 3 Fänge als "Hot Spots" markiert
- **Batterie-Optimierung**: GPS bei Stillstand pausieren (Timeout nach 5 min)

#### UI-Design
```
┌─────────────────────────────┐
│ 🔴 LIVE - 02:45 ● 12.4 km   │
├─────────────────────────────┤
│                             │
│  [Karte mit Live-Route]     │
│  ••••●●● (aktuelle Pos)     │
│                             │
│  📊 Fänge: 7 | Temp: 18°C   │
│  ⚡ Batterie: 78% (4h)       │
│                             │
│  [Fang hinzufügen] [Pause]  │
└─────────────────────────────┘
```

---

### 2.2 Echtzeit-Gezeitenhöhe + 7-Tage-Vorhersage

#### Datenquellen
1. **NOAA (National Oceanic & Atmospheric Admin)**
   - Hauptquelle für atlantische Gewässer
   - Endpoint: `https://api.noaa.gov/tides`
   - Auflösung: Stündlich, 7-10 Tage Vorhersage
   - Genauigkeit: ±0.1m

2. **Deutsches Bundesamt für Kartographie und Geodäsie (BKG)**
   - Für deutsche Küstengewässer & Flüsse
   - Endpoint: `https://tides.bkg.bund.de`
   - Deutsche Hafenstationen als Fallback

3. **GEBCO 2026 Bathymetrie**
   - Wassertiefe an Tour-Position
   - Kombiniert mit Gezeiten = absolute Tiefe

#### Vorhersage-Algorithmus

```python
# Pseudo-Code: Gezeitenprognose mit historischer Anpassung
def predict_tides(latitude, longitude, days=7):
    # 1. NOAA-Daten abrufen
    tides = fetch_noaa_tides(lat, lng)  # Zeitreihe
    
    # 2. Lokale Kalibrierung
    local_offset = calculate_offset(lat, lng)
    
    # 3. Wellengang-Auswirkung
    wind_forecast = fetch_wind_data()
    surge = estimate_wind_surge(wind_forecast)
    
    # 4. Vorhersage generieren
    predictions = []
    for hour in range(7 * 24):
        time = now + timedelta(hours=hour)
        base_height = interpolate_tide(time)
        
        # Korrektur durch lokale Faktoren
        height = base_height + local_offset + surge[hour]
        
        # Trend berechnen
        trend = "Steigend" if height > prev else "Fallend"
        
        predictions.append({
            time,
            height_m: height,
            trend,
            quality: "Optimal" if is_optimal(height) else "Gut"
        })
    
    return predictions

# Optimal = ±1 Stunde vor/nach Hochwasser oder Niedrigwasser
def is_optimal(height, lat, lng):
    extrema = [6:00 (HW), 12:30 (NW), 18:45 (HW), 01:15 (NW)]
    time_to_extrema = min(abs(now - e) for e in extrema)
    return time_to_extrema < 60  # Minuten
```

#### UI-Design (Gezeitengraph)

```
┌──────────────────────────────┐
│ 🌊 Gezeiten - WESER (Rinteln)│
│                              │
│ Heute: ↗ 1.8m → ↘ 0.4m      │
│ Morgen: ↗ 2.1m → ↘ 0.2m     │
├──────────────────────────────┤
│                              │
│ Höhe (m)                     │
│   2.5 │        ╱╲            │
│   2.0 │      ╱    ╲    ╱╲    │
│   1.5 │    ╱        ╲╱    ╲  │
│   1.0 │  ╱                  ╲ │
│   0.5 │╱                      │
│     0 └──────────────────────│ │
│       06:00  12:00  18:00 00:│ │
│                              │
│  🔴 JETZT: 1.2m (Steigend)  │
│  📍 Nächstes Hochwasser: 14:│ │
│                              │
└──────────────────────────────┘

7-Tage-Übersicht (Compact):
Mo 📈 HW:14h NW:01h │ Fangwahrsch.: 72%
Di 📉 HW:15h NW:02h │ Fangwahrsch.: 68%
Mi 📈 HW:16h NW:03h │ Fangwahrsch.: 81%
Do 📈 HW:16h NW:03h │ Fangwahrsch.: 79%
Fr 📉 HW:15h NW:02h │ Fangwahrsch.: 65%
Sa 📈 HW:14h NW:01h │ Fangwahrsch.: 75%
So 📈 HW:14h NW:01h │ Fangwahrsch.: 73%
```

---

### 2.3 Solunar-Perioden (Mondphasen + Fresszeiten)

#### Solunar-Theorie
Fische fressen konzentriert in zwei Zeitfenstern pro Tag:
- **Major Solunar Period**: 1 Stunde vor/nach Mondtransit (2 Stunden total)
- **Minor Solunar Period**: 1 Stunde vor/nach Monduntergang/aufgang (2 Stunden total)

#### Daten-Struktur

```javascript
{
  moonPhase: {
    percentage: 78, // 0-100 (0=Neumond, 50=Vollmond)
    name: "Zunehmender Mond",
    nextPhase: "Vollmond",
    daysUntilNextPhase: 3,
    illumination: 78, // %
  },
  solunarEvents: [
    {
      type: "major", // oder "minor"
      startTime: "2026-06-13T11:30:00Z",
      endTime: "2026-06-13T13:30:00Z",
      durationMinutes: 120,
      fishActivity: "Stark",
      score: 92, // 0-100
    },
    {
      type: "minor",
      startTime: "2026-06-13T19:45:00Z",
      endTime: "2026-06-13T21:45:00Z",
      durationMinutes: 120,
      fishActivity: "Moderat",
      score: 78,
    }
  ],
  dailyScore: 85, // Gesamtfangwahrscheinlichkeit heute (0-100)
  
  // Mondphasen-Empfehlungen
  seasonalInsight: {
    currentPhase: "Zunehmender Mond: Gute Beißzeiten erwartet",
    bestTechnique: "Köder mit natürlichen Bewegungen",
    avoidTechnique: "Aggressive Kunstköder weniger effektiv",
  }
}
```

#### Solunar-Berechnung (Meeus-Algorithmus)

```python
from datetime import datetime, timedelta
import math

def calculate_solunar_events(lat, lng, date):
    """
    Berechnet Major- und Minor-Solunar-Ereignisse basierend auf
    Mondposition und Transit-Zeiten.
    """
    events = []
    
    # 1. Mondposition für den Tag
    moon_data = calculate_moon_position(lat, lng, date)
    
    # 2. Transit-Zeit (Mond überquert lokalen Meridian)
    transit_time = moon_data['transit_time']
    
    # 3. Major Solunar Period (±1 Stunde um Transit)
    major_start = transit_time - timedelta(hours=1)
    major_end = transit_time + timedelta(hours=1)
    
    events.append({
        'type': 'major',
        'start': major_start,
        'end': major_end,
        'score': 95 if moon_data['moon_phase'] > 40 else 85,  # Bei Vollmond höher
    })
    
    # 4. Mondaufgang/Untergang
    moon_rise = moon_data['moonrise']
    moon_set = moon_data['moonset']
    
    # Minor Period: ±1 Stunde um Auf/Untergang
    if moon_rise:
        events.append({
            'type': 'minor',
            'start': moon_rise - timedelta(minutes=30),
            'end': moon_rise + timedelta(minutes=30),
            'score': 70,
        })
    
    if moon_set:
        events.append({
            'type': 'minor',
            'start': moon_set - timedelta(minutes=30),
            'end': moon_set + timedelta(minutes=30),
            'score': 75,
        })
    
    return sorted(events, key=lambda x: x['start'])

def calculate_daily_solunar_score(lat, lng, date, catches_history=None):
    """
    Kombiniert Solunar-Ereignisse mit historischen Fangdaten
    für ein tägliches Aktivitätsscore.
    """
    base_score = 50
    
    # Mondphase-Bonus
    moon_phase = get_moon_phase(date)
    if 40 < moon_phase < 60:  # Vollmond-Phase
        base_score += 15
    elif 0 < moon_phase < 20 or 80 < moon_phase < 100:  # Neumond-Phase
        base_score -= 5
    
    # Historische Korrektur
    if catches_history:
        best_phase_historically = analyze_catches_by_moon_phase(catches_history)
        if moon_phase in best_phase_historically:
            base_score += 10
    
    # Solunar-Ereignisse
    events = calculate_solunar_events(lat, lng, date)
    if len(events) >= 2:  # Gute Verteilung
        base_score += 10
    
    return min(100, max(0, base_score))
```

#### Solunar-Widget im Live-Trip

```
┌──────────────────────────────┐
│ 🌙 SOLUNAR-PERIODEN          │
├──────────────────────────────┤
│                              │
│ Mondphase: 78% (Wachsend)   │
│ ████████░░ (Visuell)        │
│                              │
│ ⏰ MAJOR EVENTS:             │
│  🔥 11:30-13:30 (Stark)     │
│  🟢 Score: 92/100           │
│                              │
│  🌤️ 19:45-21:45 (Moderat)   │
│  🟢 Score: 78/100           │
│                              │
│ 📊 Heute insgesamt: 85/100  │
│                              │
│ 💡 Tipp: Guter Fang erwartet│
└──────────────────────────────┘
```

---

### 2.4 KI-gestützte Fangvorhersage

#### Datenquellen & Features

```
Input-Features:
├── Echtzeit-Daten
│   ├── Aktuelle Gezeiten-Höhe
│   ├── Solunar-Score
│   ├── Temperatur
│   ├── Wind (Stärke, Richtung)
│   ├── Luftdruck-Trend
│   └── Bewölkung
│
├── Lokale Daten
│   ├── Gewässer-Typ (Fluss, See, Meer)
│   ├── Wassertiefe (aus Bathymetrie)
│   ├── Substrat-Typ (Sand, Schlamm, Fels)
│   ├── Vegetation (Kraut, Algen)
│   └── Strömung (für Flüsse)
│
├── Historische Daten (User)
│   ├── Fänge nach Tageszeit
│   ├── Fänge nach Jahreszeit
│   ├── Erfolgreiche Köder
│   ├── Erfolgreiche Techniken
│   └── Fänge nach Wetter
│
├── Regionale Benchmark-Daten
│   ├── Community-Fänge (anonymisiert)
│   ├── Saisonale Trends
│   ├── Spezies-Verteilung
│   └── Erfolgs-Hotspots
│
└── Umwelt-Daten
    ├── Wasserqualität
    ├── Algenwachstum
    ├── Fütterungs-Pattern
    └── Migration-Saison
```

#### ML-Modell (XGBoost Ensemble)

```python
class FishActivityPredictor:
    def __init__(self):
        self.models = {
            'hecht': xgb.XGBRegressor(max_depth=6),
            'barsch': xgb.XGBRegressor(max_depth=6),
            'forelle': xgb.XGBRegressor(max_depth=5),
            # ... 12+ weitere Arten
        }
    
    def predict_activity_score(self, features, species, confidence=True):
        """
        Vorhersage der Fangwahrscheinlichkeit (0-100) für eine Spezies
        basierend auf aktuellen Bedingungen.
        """
        # Feature Engineering
        processed = self._engineer_features(features)
        
        # Species-spezifisches Modell
        model = self.models[species]
        
        # Vorhersage
        score = model.predict([processed])[0]
        score = np.clip(score, 0, 100)  # 0-100 Normalisierung
        
        if confidence:
            # Konfidenz basierend auf Datenqualität
            conf = self._calculate_confidence(features, species)
            return score, conf
        
        return score
    
    def predict_optimal_times(self, species, location, next_24h=True):
        """
        Findet die besten Zeiten in den nächsten 24 Stunden
        für eine bestimmte Spezies an einem Ort.
        """
        predictions = []
        
        for hour in range(24):
            time = datetime.now() + timedelta(hours=hour)
            
            # Aktuelle Bedingungen simulieren
            features = self._get_forecast_features(location, time)
            score, conf = self.predict_activity_score(features, species)
            
            predictions.append({
                'time': time,
                'score': score,
                'confidence': conf,
                'conditions': {
                    'tide': features['tide_height'],
                    'temp': features['water_temp'],
                    'solunar': features['solunar_score'],
                    'wind': features['wind_speed'],
                }
            })
        
        # Top 3 Zeiten
        top_3 = sorted(predictions, key=lambda x: x['score'], reverse=True)[:3]
        return top_3
    
    def _engineer_features(self, raw_features):
        """Normalisierung und Feature-Kombination"""
        processed = {}
        
        # Normalisierung
        processed['tide_normalized'] = (raw_features['tide'] - 0) / 3.0
        processed['temp_normalized'] = (raw_features['temp'] - 5) / 20.0
        processed['wind_normalized'] = (raw_features['wind'] - 0) / 30.0
        
        # Interaktionen
        processed['tide_solunar_interaction'] = (
            processed['tide_normalized'] * raw_features['solunar_score'] / 100
        )
        processed['temp_wind_interaction'] = (
            processed['temp_normalized'] * processed['wind_normalized']
        )
        
        # Zyklische Variablen (Sinus/Cosinus für Tageszeit)
        hour = datetime.now().hour
        processed['hour_sin'] = np.sin(2 * np.pi * hour / 24)
        processed['hour_cos'] = np.cos(2 * np.pi * hour / 24)
        
        return processed
```

#### Vorhersage-UI

```
┌────────────────────────────────────┐
│ 🎯 KI-FANG-VORHERSAGE              │
├────────────────────────────────────┤
│                                    │
│ Für deine Region & deine Arten:    │
│                                    │
│ 🐟 HECHT (Esox lucius)             │
│   ▓▓▓▓▓▓▓▓░░ 82% Wahrscheinlichkeit│
│   ✅ Hohe Konfidenz (87%)          │
│   🎣 Beste Zeit: Nächste Stunde    │
│   💡 Köder: Gummifische (Zandern)  │
│                                    │
│ 🐟 BARSCH (Perca fluviatilis)      │
│   ▓▓▓▓▓▓░░░░ 68% Wahrscheinlichkeit│
│   ⚠️ Mittlere Konfidenz (64%)      │
│   🎣 Beste Zeit: 14:30-16:00 Uhr   │
│   💡 Köder: Wobbler (10-12cm)      │
│                                    │
│ 🐟 FORELLE (Salmo trutta)          │
│   ▓▓▓▓░░░░░░ 42% Wahrscheinlichkeit│
│   ❌ Niedrige Konfidenz (45%)      │
│   🎣 Beste Zeit: Morgen (05:00-07) │
│   💡 Köder: Fliegen (#16-18)       │
│                                    │
│ 📊 Bedingungen analysiert:         │
│    Gezeiten ✅ | Solunar ✅        │
│    Wetter ⚠️  | Saison ✅          │
│                                    │
└────────────────────────────────────┘
```

---

### 2.5 Push-Notifications bei Optimalbedingungen

#### Notification-Trigger

```javascript
const notificationTriggers = [
  {
    id: 'optimal_solunar',
    condition: 'solunarScore > 80 AND isInMinor/MajorWindow',
    title: '🔥 OPTIMALE FRESSZEIT!',
    body: 'Solunar-Peak: Nächste 2 Stunden sind ideal',
    priority: 'high',
    sound: true,
    vibrate: [200, 100, 200],
  },
  {
    id: 'tide_change',
    condition: 'tideChange === true AND (risingTide OR fallingTide)',
    title: '🌊 GEZEITENWECHSEL',
    body: 'Wechsel zu Hochwasser - Aktivität steigt',
    priority: 'high',
  },
  {
    id: 'peak_prediction',
    condition: 'predictedActivityScore > 85 AND species === favorite',
    title: '⭐ PERFEKTE BEDINGUNGEN',
    body: 'KI sagt: Hechte beißen jetzt - Los geht\'s!',
    priority: 'high',
    image: 'notification_pike.png',
  },
  {
    id: 'nearby_hotspot',
    condition: 'distance(currentLocation, hotspot) < 2km AND hasHighCatches',
    title: '📍 HOT-SPOT IN DER NÄHE!',
    body: '3km nördlich: 12+ Fänge in diesem Monat',
    priority: 'medium',
    actions: [
      { title: 'Navigator öffnen', action: 'navigate_to_hotspot' },
      { title: 'Tour beenden', action: 'end_trip' }
    ],
  },
  {
    id: 'temperature_optimal',
    condition: 'waterTemp between optimalRange[species]',
    title: '🌡️ IDEALE TEMPERATUR',
    body: 'Wasser: 17°C - Perfekt für Forellen',
    priority: 'medium',
  },
  {
    id: 'weather_change',
    condition: 'weatherChange === significant AND impacts_fishing',
    title: '⛈️ WETTERWECHSEL',
    body: 'Luftdruck fällt - Fischaktivität erwartet',
    priority: 'medium',
  }
];
```

#### Notification-Management

```javascript
// LocalNotifications (Offline-fähig)
class LiveTripNotificationManager {
  constructor() {
    this.activeNotifications = new Set();
    this.notificationHistory = [];
    this.userPreferences = loadFromLocalStorage('notificationPrefs');
  }

  async evaluateAndNotify(liveData) {
    for (const trigger of notificationTriggers) {
      // 1. Bedingung evaluieren
      if (this.evaluateCondition(trigger.condition, liveData)) {
        // 2. Duplikate verhindern (gleiche Notification nicht 2x in 30 Min)
        if (!this.isDuplicate(trigger.id)) {
          // 3. Benutzer-Preferenzen prüfen
          if (this.userPreferences[trigger.id] !== 'disabled') {
            // 4. Notification anzeigen
            await this.sendNotification(trigger, liveData);
            
            // 5. Tracking
            this.activeNotifications.add(trigger.id);
            this.notificationHistory.push({
              triggerId: trigger.id,
              timestamp: Date.now(),
              conditions: liveData
            });
          }
        }
      }
    }
  }

  async sendNotification(trigger, context) {
    // Lokale Notification (funktioniert offline)
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(trigger.title, {
        body: trigger.body,
        icon: '/icons/fishing-icon.png',
        badge: '/icons/badge.png',
        tag: trigger.id, // Deduplizierung
        requireInteraction: trigger.priority === 'high',
        sound: trigger.sound ? '/sounds/notification.mp3' : undefined,
        vibrate: trigger.vibrate,
      });

      notification.addEventListener('click', () => {
        window.focus();
        this.handleNotificationClick(trigger.id, context);
      });
    }

    // Firebase Messaging (Online fallback)
    if (navigator.onLine && window.firebase) {
      await sendRemoteNotification(trigger, context);
    }
  }

  handleNotificationClick(triggerId, context) {
    switch(triggerId) {
      case 'peak_prediction':
        openSpeciesDetailView(context.species);
        break;
      case 'nearby_hotspot':
        openMapWithHotspot(context.hotspot);
        break;
      case 'tide_change':
        scrollToTideWidget();
        break;
    }
  }

  isDuplicate(triggerId) {
    // Nicht 2x die gleiche Notification in 30 Minuten
    const lastSent = this.notificationHistory
      .filter(h => h.triggerId === triggerId)
      .slice(-1)[0];
    
    if (!lastSent) return false;
    return Date.now() - lastSent.timestamp < 30 * 60 * 1000;
  }
}
```

---

### 2.6 Offline-Karten & Trip-Daten

#### Offline-Funktionalität

```javascript
// Offline Trip Management
class OfflineTripStorage {
  async startTrip(tripData) {
    const tripId = `trip_${Date.now()}`;
    
    // Speichere Trip-Metadaten
    await this.db.trips.add({
      id: tripId,
      startedAt: new Date(),
      location: {
        lat: tripData.lat,
        lng: tripData.lng,
        name: tripData.spotName,
      },
      species: tripData.targetSpecies,
      status: 'active',
      offlineSync: 'pending',
    });

    // Aktiviere offline Gezeiten-Daten (48 Stunden)
    await this.cacheOfflineData(tripData.location, 48);
    
    return tripId;
  }

  async cacheOfflineData(location, hoursAhead) {
    // Gezeiten-Daten
    const tides = await this.fetchAndCacheTides(
      location.lat,
      location.lng,
      hoursAhead
    );

    // Solunar-Daten
    const solunar = await this.calculateAndCacheSolunar(
      location.lat,
      location.lng,
      hoursAhead
    );

    // Karten-Tiles (Offline-Renderer)
    const tiles = await this.prefetchMapTiles(
      location.lat,
      location.lng,
      radius: 10 // km
    );

    // Lokal speichern (IndexedDB)
    await this.db.offlineCache.add({
      location,
      tides,
      solunar,
      tiles,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (hoursAhead * 60 * 60 * 1000),
    });
  }

  async recordCatch(tripId, catchData) {
    // GPS-gekoppelter Fang-Record
    const catch_ = {
      id: `catch_${Date.now()}`,
      tripId,
      timestamp: new Date(),
      location: {
        lat: navigator.geolocation.latitude,
        lng: navigator.geolocation.longitude,
      },
      species: catchData.species,
      weight: catchData.weight,
      length: catchData.length,
      method: catchData.method,
      bait: catchData.bait,
      conditions: {
        tideHeight: this.currentTide.height,
        waterTemp: this.currentWeather.temp,
        solunarScore: this.currentSolunar.score,
        windSpeed: this.currentWeather.wind,
        lightCondition: this.detectLightLevel(), // AUTO
      },
      photo: catchData.photo, // BLOB
    };

    // Offline speichern
    await this.db.catches.add(catch_);
    
    return catch_;
  }

  async syncTripOnlineWhenReady() {
    // Wartet auf Konnektivität, synced Offline-Daten
    if (!navigator.onLine) {
      // Offline: Speichere lokal
      return;
    }

    const pendingTrips = await this.db.trips.where('offlineSync').equals('pending').toArray();

    for (const trip of pendingTrips) {
      try {
        // Upload Trip + Catches + Fotos
        await this.uploadTripData(trip);
        
        // Update Status
        trip.offlineSync = 'synced';
        await this.db.trips.update(trip.id, trip);
        
      } catch (error) {
        console.error(`Sync failed for trip ${trip.id}:`, error);
        trip.offlineSync = 'failed';
      }
    }
  }
}
```

---

## 3. User Experience & Interface

### 3.1 Live-Trip Start-Flow

```
┌──────────────────────────────┐
│ 🎣 NEUE TOUR STARTEN         │
├──────────────────────────────┤
│                              │
│ 📍 Angelplatz:               │
│   [Aktuelle Position ▼]      │
│   Oder: [Karte wählen]       │
│                              │
│ 🎯 Zielart(en):              │
│   ☑ Hecht   ☑ Barsch        │
│   ☐ Forelle ☐ Schleie       │
│   [+ Weitere 8 Arten]        │
│                              │
│ ⚙️ Optionen:                  │
│   ☑ GPS-Tracking            │
│   ☑ Live-Notifications      │
│   ☑ Offline-Modus           │
│                              │
│          [TOUR STARTEN]      │
│                              │
└──────────────────────────────┘
        ↓ (aktiviert alle Sensoren)
┌──────────────────────────────┐
│ LIVE-TRIP DASHBOARD          │
│ (siehe Abschnitt 1.1)        │
└──────────────────────────────┘
```

### 3.2 Dashboard-Layout (Mobile-First)

```
PORTRAIT MODE:
┌─────────────────────────────┐
│ [Status-Bar: 02:45 | 🔋78%] │
├─────────────────────────────┤
│ 🔴 LIVE 🌊 12.4km ⚡ 7 Fänge │
├─────────────────────────────┤
│                             │
│   [Karte mit Route]         │
│   (Tap für Vollbild)        │
│                             │
├─────────────────────────────┤
│ 🎯 KI-Vorhersage (Swipe)    │
│ ⏱️ Nächstes Peak: 14:30      │
│ 📊 Activity: 82% (Hecht)    │
├─────────────────────────────┤
│ 🌊 Gezeiten: ↗ 1.2m         │
│ 🌙 Solunar: 92 (Optimal)    │
│ 🌡️ Wasser: 18°C | 💨 4 km/h │
├─────────────────────────────┤
│ [+ Fang] [Pause] [Beenden]  │
└─────────────────────────────┘

LANDSCAPE MODE (Optimiert):
┌──────────────────────────────────┐
│ 02:45 | 🌊 12.4km | 🔋78% | 7🐟 │
├──────────────────────────────────┤
│  [Große Karte]    │ 🎯 Vorhersage │
│  (Route + Route) │ ├─────────────┤
│                  │ Hecht: 82%   │
│                  │ ✨ Peak: 14:30
│  [GPS-Daten]     │             │
│                  │ 🌊 Gezeiten  │
│  Position:       │ ↗ 1.2m       │
│  52.123, 9.567   │             │
│                  │ 🌙 Solunar   │
│  Speed: 2.5 km/h │ 92 (Optimal) │
│  Route: 12.4 km  │             │
│                  │ 🌡️ 18°C | 💨4│
├──────────────────────────────────┤
│ [+ Fang] [Pause] [Beenden]       │
└──────────────────────────────────┘
```

---

## 4. Technische Architektur

### 4.1 Stack

```
Frontend:
├── React 18 + Vite (bestehend)
├── Leaflet (Kartendarstellung)
├── Chart.js / D3.js (Gezeiten-Grafik)
├── Zustand (State Management für Trip-Session)
├── IndexedDB / LocalStorage (Offline-Daten)
└── Service Worker (Offline-Funktionalität)

Backend:
├── Vercel Serverless (bestehend)
├── Express (API-Layer)
├── Bull Queue (Async Jobs)
├── Supabase (PostgreSQL für Trip-Daten)
└── Redis (Session-Cache, Notifications)

Externe Services:
├── NOAA Tides API (Gezeiten)
├── OpenWeather API (Wetter/Wind)
├── Google Maps API (Reverse Geocoding)
├── Firebase Cloud Messaging (Push)
└── Custom ML Service (TensorFlow.js für lokale Vorhersagen)
```

### 4.2 Datenbank-Schema

```sql
-- Trips (Touren)
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  location_start GEOMETRY(Point, 4326),
  location_end GEOMETRY(Point, 4326),
  distance_km FLOAT,
  duration_minutes INT,
  catch_count INT,
  species TEXT[], -- Array
  status ENUM('active', 'paused', 'completed', 'draft'),
  offline_sync ENUM('pending', 'synced', 'failed'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Route Points (GPS-Trackpunkte)
CREATE TABLE route_points (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  coordinates GEOMETRY(Point, 4326),
  timestamp TIMESTAMP,
  speed_kmh FLOAT,
  heading_degrees INT,
  accuracy_meters INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_trip_route ON route_points(trip_id, timestamp);

-- Catches (Fänge)
CREATE TABLE catches (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  species TEXT,
  weight_grams INT,
  length_cm FLOAT,
  method TEXT,
  bait TEXT,
  location GEOMETRY(Point, 4326),
  caught_at TIMESTAMP,
  
  -- Bedingungen zum Fang-Zeitpunkt
  tide_height_m FLOAT,
  water_temp_c FLOAT,
  solunar_score INT,
  wind_speed_kmh INT,
  light_condition TEXT,
  
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trip Sessions (für Echtzeit-Tracking)
CREATE TABLE trip_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,
  trip_id UUID REFERENCES trips(id),
  status ENUM('active', 'paused', 'ended'),
  current_location GEOMETRY(Point, 4326),
  last_update TIMESTAMP,
  gps_accuracy_m INT,
  offline_mode BOOLEAN,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tide Predictions (Cache)
CREATE TABLE tide_predictions (
  id BIGSERIAL PRIMARY KEY,
  location GEOMETRY(Point, 4326),
  prediction_time TIMESTAMP,
  height_m FLOAT,
  trend TEXT,
  confidence FLOAT,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tide_location_time ON tide_predictions(location, prediction_time);

-- Solunar Events
CREATE TABLE solunar_events (
  id BIGSERIAL PRIMARY KEY,
  location GEOMETRY(Point, 4326),
  event_date DATE,
  event_type ENUM('major', 'minor'),
  start_time TIME,
  end_time TIME,
  moon_phase INT,
  fish_activity_score INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ML Predictions (Cache)
CREATE TABLE ml_predictions (
  id BIGSERIAL PRIMARY KEY,
  location GEOMETRY(Point, 4326),
  prediction_time TIMESTAMP,
  species TEXT,
  activity_score FLOAT,
  confidence FLOAT,
  input_features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Datenquellen & APIs

### 5.1 Gezeiten-Integration

```javascript
// API Service
class TideService {
  async getTideData(lat, lng, days = 7) {
    // 1. Versuche lokale Datenbank (Cache)
    const cached = await this.getTideCacheIfValid(lat, lng);
    if (cached) return cached;

    // 2. Versuche NOAA API
    try {
      const noaaData = await this.fetchNOAATides(lat, lng, days);
      await this.cacheTides(lat, lng, noaaData);
      return noaaData;
    } catch (error) {
      console.warn('NOAA API failed:', error);
    }

    // 3. Fallback: Vereinfachte Vorhersage (Sinus-Curve)
    const simplified = this.generateSimplifiedTides(lat, lng, days);
    return simplified;
  }

  async fetchNOAATides(lat, lng, days) {
    // Nähe Tidestation finden
    const station = await this.findNearestTideStation(lat, lng);
    
    const response = await fetch(
      `https://api.noaa.gov/tides?station=${station}&days=${days}`
    );
    
    const data = await response.json();
    return {
      station: station,
      predictions: data.map(p => ({
        time: new Date(p.t),
        height: parseFloat(p.v),
        type: p.type, // 'H' oder 'L'
      })),
    };
  }

  generateSimplifiedTides(lat, lng, days) {
    // Fallback Sinus-basierte Vorhersage
    const predictions = [];
    const now = new Date();
    const period = 12.42 * 60 * 60 * 1000; // Mondtag in ms
    const amplitude = 1.5; // m

    for (let i = 0; i < days * 24; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const phase = ((time.getTime() % period) / period) * 2 * Math.PI;
      
      const height = 1.0 + amplitude * Math.sin(phase);
      
      predictions.push({
        time,
        height: Math.max(0, height),
        type: Math.sin(phase) > 0 ? 'rising' : 'falling',
      });
    }

    return { predictions, source: 'simplified' };
  }
}
```

### 5.2 Solunar-Datenquellen

```python
# Backend: Astronomical Calculations
class SolunarCalculator:
    def __init__(self):
        # Ephemeris für Mondposition
        self.ephemeris = Ephemeris()
    
    def get_moon_phase(self, date):
        """
        Berechnet Mondphase (0-100%) für einen Tag
        basierend auf Ephemeriden.
        """
        jd = self.ephemeris.julian_day(date)
        new_moon_jd = self.ephemeris.nearest_new_moon(jd)
        lunation_length = 29.530588  # Synodischer Monat (Tage)
        
        phase_fraction = (jd - new_moon_jd) / lunation_length
        phase_fraction = phase_fraction % 1.0
        
        return phase_fraction * 100
    
    def calculate_moon_transit(self, lat, lng, date):
        """
        Berechnet Zeit des Mond-Transits (Meridian-Übergang)
        für eine geografische Position.
        """
        location = wgs84.latlong(lat, lng)
        observer = location.to_observer()
        
        t = load.timescale().utc(date.year, date.month, date.day, 12)
        moon = load('de421.bsp')['moon']
        
        astrometric = observer.at(t).observe(moon)
        apparent = astrometric.apparent()
        
        # Transit-Zeit iterativ finden
        transit_time = self._find_transit_time(observer, moon, t)
        return transit_time
    
    def calculate_solunar_periods(self, lat, lng, date):
        """
        Hauptfunktion: Berechnet alle Solunar-Perioden für einen Tag.
        """
        events = []
        
        # Major Period (Mond-Transit)
        transit = self.calculate_moon_transit(lat, lng, date)
        major_start = transit - timedelta(hours=1)
        major_end = transit + timedelta(hours=1)
        
        events.append({
            'type': 'major',
            'start': major_start,
            'end': major_end,
            'score': self._calculate_score('major', date),
        })
        
        # Minor Periods (Mond Auf-/Untergang)
        rise = self._find_moonrise(lat, lng, date)
        set_time = self._find_moonset(lat, lng, date)
        
        if rise:
            events.append({
                'type': 'minor',
                'start': rise - timedelta(minutes=30),
                'end': rise + timedelta(minutes=30),
                'score': self._calculate_score('minor', date),
            })
        
        if set_time:
            events.append({
                'type': 'minor',
                'start': set_time - timedelta(minutes=30),
                'end': set_time + timedelta(minutes=30),
                'score': self._calculate_score('minor', date),
            })
        
        return sorted(events, key=lambda e: e['start'])
    
    def _calculate_score(self, event_type, date):
        """
        Berechnet Score basierend auf Mondphase.
        Vollmond = höherer Score.
        """
        phase = self.get_moon_phase(date)
        base_score = 70 if event_type == 'major' else 50
        
        # Bonus während Vollmond-Phase (40-60%)
        if 40 < phase < 60:
            base_score += 20
        # Penalty während Neumond-Phase
        elif phase < 10 or phase > 90:
            base_score -= 10
        
        return min(100, max(0, base_score))
```

---

## 6. Alleinstellungsmerkmale vs. Konkurrenz

### 6.1 Differenzierung zu Fishbrain

| Merkmal | Fishbrain | BaitBuddy Live-Trip |
|---------|-----------|-------------------|
| **Gezeiten-Integration** | Social Catch-Log | Echtzeit-Vorhersagen mit NOAA |
| **Wissenschaftliche Daten** | Community-basiert | Solunar + Ephemeris |
| **Offline-Funktionalität** | Begrenzt | Vollständig (Gezeiten, Solunar, Karten) |
| **KI-Vorhersagen** | Trending-Analyse | XGBoost-Modell mit historischen Daten |
| **Push-Benachrichtigungen** | Generisch | Trigger-basiert & artenspezifisch |
| **GPS-Tracking** | Basis | Hochauflösung mit Hot-Spot-Detektion |
| **Zielgruppe** | Casual Angler | Hobby + Semi-Professionell |

### 6.2 Differenzierung zu ANGLR

| Merkmal | ANGLR | BaitBuddy Live-Trip |
|---------|-------|-------------------|
| **AR-Technologie** | Stark | Nicht primär |
| **Gezeiten-Daten** | Vorhanden (einfach) | Hochauflösung + Vorhersage |
| **Solunar** | Nur Mondphase | Vollständige Solunar-Theorie |
| **Offline-Modus** | Begrenzt | Vollständig |
| **KI-Intelligenz** | Pattern-Recognition | Machine Learning (XGBoost) |
| **Kostenpunkt** | Premium | Premium + value |

### 6.3 USPs (Unique Selling Points)

1. **Solunar + Gezeiten Sync**
   - Nicht nur einzelne Faktoren, sondern kombinierte Intelligenz
   - Zeigt beste Fenster wenn Solunar + Gezeiten optimal sind

2. **Historische Lernfähigkeit**
   - App lernt aus DEINEN Fängen
   - "Du fängst Hechte am liebsten bei fallenden Gezeiten" → automatisch berücksichtigt

3. **Offline = Unabhängig**
   - Vollständige Trip-Daten auch ohne Netz
   - Keine Abhängigkeit von Cloud-Diensten während der Tour

4. **Artenspezifische KI**
   - Nicht generisch, sondern 12+ Fischarten mit eigenen Modellen
   - Aal braucht andere Bedingungen als Barsch

5. **Wissenschaftlicher Anspruch**
   - Basierend auf Astronomie (Ephemeris) + Ozeanographie (NOAA)
   - Nicht "glaube der KI", sondern "verstehe warum"

---

## 7. Implementierungs-Roadmap

### Phase 1: MVP (3-4 Wochen)
- ✅ GPS-Tracking (Route + Fang-Positionen)
- ✅ Echtzeit-Gezeiten-Widget (NOAA API)
- ✅ Basis-Solunar-Kalender (vereinfacht)
- ✅ Offline-Trip-Speicherung (IndexedDB)
- ✅ Live-Dashboard UI

### Phase 2: KI-Integration (2-3 Wochen)
- ✅ ML-Modell Training (historische Daten)
- ✅ Fangvorhersage-Widget
- ✅ Artenspezifische Modelle (Top 5 Fischarten)
- ✅ Konfidenz-Berechnung

### Phase 3: Smart Notifications (1-2 Wochen)
- ✅ Notification-Trigger-System
- ✅ Firebase Cloud Messaging Setup
- ✅ Lokale Notifications (offline)
- ✅ Benutzer-Preferences

### Phase 4: Polish & Optimierung (1-2 Wochen)
- ✅ Performance-Optimierung
- ✅ Batterie-Optimierung (GPS-Strategien)
- ✅ Fehler-Handling & Edge Cases
- ✅ Abhängigkeitstests

---

## 8. Technische Anforderungen & Abhängigkeiten

### 8.1 Neue npm-Packages

```json
{
  "dependencies": {
    "axios": "^1.6.0",  // HTTP requests
    "chart.js": "^4.4.0",  // Gezeitengrafik
    "date-fns": "^2.30.0",  // Datum-Utilities
    "react-leaflet": "^4.2.0",  // (bereits vorhanden)
    "zustand": "^4.4.0",  // State Management
    "firebase": "^10.0.0",  // Push Notifications
    "xgboost-js": "^2.1.0",  // ML-Modell Inferenz
  },
  "devDependencies": {
    "tensorflow": "^4.0.0",  // Modell-Training (nur Backend)
  }
}
```

### 8.2 Backend-Dependencies (Python)

```txt
numpy==1.24.0
pandas==2.0.0
scikit-learn==1.3.0
xgboost==2.0.0
ephem==4.1.5  # Astronomische Berechnungen
pytz==2023.3
```

---

## 9. Marketing & Go-To-Market

### 9.1 Positionierung

> **"BaitBuddy Live-Trip: Die erste Fischerapp mit wissenschaftlicher Gezeiten-Intelligenz"**

- Für: Hobby-Angler bis Semi-Professionelle
- Wert: +30-50% mehr Fänge durch bessere Timing
- Beweis: Solunar + Gezeiten + KI-Vorhersagen

### 9.2 Launch-Content

1. **Video**: "Wie Gezeiten deine Angelausbeute verdoppeln" (YouTube)
2. **Blog**: "Solunar-Kalender richtig nutzen" (SEO)
3. **Demo**: Live-Trip-Session mit Statistiken
4. **Community**: Fang-Challenges mit Live-Trip-Rankings

---

## 10. Success-Metrics

- **Adoption**: 5.000+ Nutzer in 3 Monaten
- **Engagement**: 2x pro Woche min. eine Live-Trip
- **Retention**: 60% MAU (Monthly Active Users)
- **Monetisierung**: 500+ Premium-Subscriber
- **Fang-Verbesserung**: +35% Fänge (Nutzer-Feedback)

---

## Zusammenfassung

Der **Live-Trip-Modus** ist das Differenzierungs-Feature, das BaitBuddy zu einer **wissenschaftlich fundierten Profi-App** macht. Durch die Kombination von **Echtzeit-Daten** (Gezeiten, Solunar), **Machine Learning** (artenspezifische Vorhersagen) und **Offline-Unabhängigkeit** bietet BaitBuddy etwas, das Fishbrain und ANGLR nicht haben: eine App, die Angler wirklich intelligenter macht.

**Nächste Schritte:**
1. ✅ Genehmigung des Konzepts
2. → MVP-Spezifikation (Detailliertes Design-Doc)
3. → Estimations-Meeting (Story Points)
4. → Sprint-Planning für Phase 1
