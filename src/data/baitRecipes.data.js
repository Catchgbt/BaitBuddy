// Vordefinierte Premium-Rezepte für alle Süßwasserfische
// Diese Rezepte sind bewährte Mischungen mit optimalen Verhältnissen für verschiedene Jahreszeiten

export const PREDEFINED_RECIPES = {
  "Karpfen": [
    {
      id: "carp-summer-classic",
      name: "Karpfen-Mix Sommer",
      fish: "Karpfen",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Klassische Sommermaischung mit hohem Zucker- und Fettanteil",
      ingredients: {
        "Fischmehl": 20,
        "Sojamehl": 15,
        "Maisgries": 15,
        "Hafermehl": 15,
        "Melasse": 20,
        "Fischöl": 15
      },
      notes: "Ideal für Temperaturen 18–24°C. Beständigkeit: 4–6 Wochen.",
      base_score: 78
    },
    {
      id: "carp-winter-intense",
      name: "Karpfen-Mix Winter",
      fish: "Karpfen",
      category: "boilies",
      season: "winter",
      difficulty: "medium",
      description: "Intensive Wintermischung mit hohem Proteinanteil und Lockstoffen",
      ingredients: {
        "Fischmehl": 30,
        "Maiskeimöl": 15,
        "Betain": 10,
        "Fleischmehl": 15,
        "Fischöl": 20,
        "Lebertran": 10
      },
      notes: "Für träge Winterfische. Starker Geruch aktiviert langsamen Appetit.",
      base_score: 82
    },
    {
      id: "carp-allround",
      name: "Karpfen Allround",
      fish: "Karpfen",
      category: "bait",
      season: "allround",
      difficulty: "easy",
      description: "Vielseitige Anfütterung für ganzjährige Nutzung",
      ingredients: {
        "Fischmehl": 25,
        "Maisgries": 20,
        "Sojaöl": 20,
        "Hafermehl": 15,
        "Molasse": 20
      },
      notes: "Günstig herzustellen, konstant wirksam. Große Mengen möglich.",
      base_score: 75
    },
    {
      id: "carp-spring-energizer",
      name: "Karpfen Spring Energizer",
      fish: "Karpfen",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Hochenergetische Frühjahrs-Mischung nach dem Winter",
      ingredients: {
        "Fischmehl": 25,
        "Maiskeimöl": 18,
        "Honig": 12,
        "Sojamehl": 15,
        "Hafermehl": 15,
        "Knoblauchöl": 5,
        "Bierhefe": 10
      },
      notes: "Weckt Hungergefühl nach Winterpause. Optimale Aktivierungsmischung.",
      base_score: 81
    },
    {
      id: "carp-summer-spice",
      name: "Karpfen Spice Mix",
      fish: "Karpfen",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Gewürzmischung mit natürlichen Lockdüften",
      ingredients: {
        "Fischmehl": 22,
        "Maisgries": 18,
        "Sojaöl": 18,
        "Paprika": 8,
        "Vanilleextrakt": 6,
        "Schwarzkümmel": 4,
        "Molasse": 15,
        "Lebertran": 9
      },
      notes: "Exotische Gewürze locken auch skeptische Fische an.",
      base_score: 79
    },
    {
      id: "carp-autumn-harvest",
      name: "Karpfen Herbst Ernte",
      fish: "Karpfen",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Premium Herbstmischung vor Winterschlaf — maximale Reizung",
      ingredients: {
        "Fischmehl": 28,
        "Fleischmehl": 15,
        "Maiskeimöl": 12,
        "Lebertran": 12,
        "Orangen-Extrakt": 8,
        "Spinnenöl": 7,
        "Bierhefe": 8,
        "Betain": 10
      },
      notes: "Fische fressen massiv vor Winter. Extrem wirksam Oktober–November.",
      base_score: 85
    }
  ],
  "Brassen": [
    {
      id: "bream-summer-light",
      name: "Brassen-Mix Sommer",
      fish: "Brassen",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Leichte Sommermaischung mit Fokus auf Tierische Proteine",
      ingredients: {
        "Fischmehl": 25,
        "Sojamehl": 15,
        "Insektenmehl": 15,
        "Maisgries": 20,
        "Seealgenmehl": 10,
        "Sonnenblumenöl": 15
      },
      notes: "Brassen mögen feines Granulat. Kleine bis mittlere Köder empfohlen.",
      base_score: 76
    },
    {
      id: "bream-winter-stimulant",
      name: "Brassen-Mix Winter",
      fish: "Brassen",
      category: "bait",
      season: "winter",
      difficulty: "medium",
      description: "Stimulierende Mischung mit zusätzlichen Lockdüften",
      ingredients: {
        "Fischmehl": 30,
        "Maiskeimöl": 15,
        "Vanilleextrakt": 5,
        "Fleischmehl": 15,
        "Fischöl": 25,
        "Bierhefe": 10
      },
      notes: "Starker Duft weckt Interesse auch bei niedrigen Temperaturen.",
      base_score: 79
    },
    {
      id: "bream-spring-tender",
      name: "Brassen Spring Tender",
      fish: "Brassen",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Sanfte Frühjahrs-Mischung speziell für Brassen-Schwärme",
      ingredients: {
        "Insektenmehl": 22,
        "Fischmehl": 20,
        "Maisgries": 18,
        "Seealgenmehl": 12,
        "Sonnenblumenöl": 15,
        "Bierhefe": 8,
        "Traubenzucker": 5
      },
      notes: "Brassen fressen massiv im März–April. Feines Granulat bevorzugt.",
      base_score: 78
    },
    {
      id: "bream-summer-spicy",
      name: "Brassen Spice Granulat",
      fish: "Brassen",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Würziges Granulat mit feinen Gewürzen",
      ingredients: {
        "Paniermehl": 20,
        "Insektenmehl": 18,
        "Sonnenblumenöl": 15,
        "Bierhefe": 12,
        "Schwarzkümmel": 8,
        "Muskatnuss": 5,
        "Seealgenmehl": 10,
        "Zucker": 12
      },
      notes: "Lockduft lockt Schwärme aus großen Entfernungen an.",
      base_score: 77
    },
    {
      id: "bream-autumn-feast",
      name: "Brassen Herbst Festmahl",
      fish: "Brassen",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Energiereiche Herbstmischung — Massenfütterung",
      ingredients: {
        "Fischmehl": 28,
        "Insektenmehl": 18,
        "Maiskeimöl": 14,
        "Honig": 10,
        "Fleischmehl": 8,
        "Lebertran": 8,
        "Bierhefe": 8,
        "Schwarzkümmel": 6
      },
      notes: "Brassen fressen wie verrückt im September–Oktober. Höchste Erfolgsquote.",
      base_score: 84
    }
  ],
  "Rotauge": [
    {
      id: "roach-summer-fine",
      name: "Rotauge-Mix Sommer",
      fish: "Rotauge",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Feinkörnig mit mittleren Proteinen",
      ingredients: {
        "Braunmehl": 25,
        "Hafermehl": 20,
        "Sonnenblumenöl": 20,
        "Bierhefe": 15,
        "Traubenzucker": 15,
        "Muskatnuss": 5
      },
      notes: "Kleine Köder bevorzugt. Sehr schmackhaft für Schwärme.",
      base_score: 74
    },
    {
      id: "roach-allround",
      name: "Rotauge Ganzjahres",
      fish: "Rotauge",
      category: "bait",
      season: "allround",
      difficulty: "easy",
      description: "Einfache, bewährte Anfütterung",
      ingredients: {
        "Weizenkleie": 30,
        "Braunmehl": 25,
        "Sonnenblumenöl": 20,
        "Paniermehl": 15,
        "Zucker": 10
      },
      notes: "Kostengünstig, schnell zu machen, sehr wirksam.",
      base_score: 72
    },
    {
      id: "roach-spring-awakening",
      name: "Rotauge Spring Erwachen",
      fish: "Rotauge",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Leichte Frühjahrs-Aktivierungsmischung",
      ingredients: {
        "Braunmehl": 22,
        "Hafermehl": 18,
        "Bierhefe": 18,
        "Sonnenblumenöl": 18,
        "Traubenzucker": 12,
        "Honig": 6,
        "Vanilleextrakt": 6
      },
      notes: "Rotaugen reagieren schnell auf süße Lockdüfte im Frühjahr.",
      base_score: 75
    },
    {
      id: "roach-summer-honey",
      name: "Rotauge Honig Granulat",
      fish: "Rotauge",
      category: "bait",
      season: "summer",
      difficulty: "easy",
      description: "Honig-basiertes Granulat für Massenfütterung",
      ingredients: {
        "Braunmehl": 24,
        "Paniermehl": 18,
        "Sonnenblumenöl": 16,
        "Honig": 12,
        "Bierhefe": 12,
        "Muskatnuss": 4,
        "Zucker": 14
      },
      notes: "Süße Lockdüfte ziehen Schwärme magisch an. Effiziente Anfütterung.",
      base_score: 76
    },
    {
      id: "roach-winter-power",
      name: "Rotauge Winter Power",
      fish: "Rotauge",
      category: "boilies",
      season: "winter",
      difficulty: "medium",
      description: "Hochenergetische Wintermischung",
      ingredients: {
        "Braunmehl": 26,
        "Hafermehl": 16,
        "Fischmehl": 12,
        "Sonnenblumenöl": 16,
        "Lebertran": 8,
        "Bierhefe": 10,
        "Muskatnuss": 6,
        "Zucker": 10
      },
      notes: "Winterfische brauchen kalorenreiche Mischungen. Höhere Proteindichte.",
      base_score: 79
    }
  ],
  "Hecht": [
    {
      id: "pike-summer-meaty",
      name: "Hecht-Mix Sommer",
      fish: "Hecht",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Fleischhaltig mit intensivem Geschmack",
      ingredients: {
        "Fleischmehl": 30,
        "Fischmehl": 25,
        "Fischöl": 20,
        "Paprika": 10,
        "Maiskeimöl": 10,
        "Salz": 5
      },
      notes: "Räuber mit ausgeprägtem Jagdinstinkt. Starke Düfte wirken reizend.",
      base_score: 80
    },
    {
      id: "pike-winter-aggressive",
      name: "Hecht-Mix Winter",
      fish: "Hecht",
      category: "bait",
      season: "winter",
      difficulty: "hard",
      description: "Aggressive Wintermischung mit hohem Aktivierungspotenzial",
      ingredients: {
        "Fleischmehl": 35,
        "Lebertran": 20,
        "Paprikakraut": 15,
        "Fischmehl": 20,
        "Knoblauchöl": 5,
        "Salz": 5
      },
      notes: "Sehr starker Geschmack. Deutlich aggressivere Strikes.",
      base_score: 85
    },
    {
      id: "pike-spring-predator",
      name: "Hecht Spring Predator",
      fish: "Hecht",
      category: "boilies",
      season: "summer",
      difficulty: "hard",
      description: "Ultra-aggressive Frühjahrs-Mischung — maximale Reizung",
      ingredients: {
        "Fleischmehl": 32,
        "Fischmehl": 28,
        "Fischöl": 18,
        "Paprika": 8,
        "Knoblauchöl": 8,
        "Spinnenöl": 4,
        "Salz": 2
      },
      notes: "März–Mai: Heckte sind hungrig. Maximale Jagdinstinkt-Reizung.",
      base_score: 88
    },
    {
      id: "pike-summer-subtle",
      name: "Hecht Subtle Hunter",
      fish: "Hecht",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Subtile Sommermischung mit gezielten Lockreizen",
      ingredients: {
        "Fleischmehl": 28,
        "Fischmehl": 22,
        "Fischöl": 18,
        "Maiskeimöl": 12,
        "Paprika": 8,
        "Knoblauch": 6,
        "Salz": 6
      },
      notes: "Für wählerische Sommerheckte. Balance zwischen Aggression und Subtilität.",
      base_score: 79
    },
    {
      id: "pike-autumn-gorge",
      name: "Hecht Herbst Völlerei",
      fish: "Hecht",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Rausch-Mischung für September–Oktober Massenfütterung",
      ingredients: {
        "Fleischmehl": 36,
        "Fischmehl": 24,
        "Lebertran": 16,
        "Fischöl": 10,
        "Paprika": 6,
        "Knoblauchöl": 4,
        "Spinnenöl": 3,
        "Salz": 1
      },
      notes: "Heckte fressen vor Winter wie besessen. Extremste Effektivität.",
      base_score: 89
    }
  ],
  "Zander": [
    {
      id: "pike-perch-summer-balanced",
      name: "Zander-Mix Sommer",
      fish: "Zander",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Ausgewogene Mischung mit moderatem Proteingehalt",
      ingredients: {
        "Fischmehl": 28,
        "Fleischmehl": 17,
        "Maisgries": 18,
        "Fischöl": 18,
        "Sojamehl": 12,
        "Dill": 7
      },
      notes: "Zander sind visuell orientiert. Saubere Präsentation wichtig.",
      base_score: 77
    },
    {
      id: "pike-perch-winter-aggressive",
      name: "Zander-Mix Winter",
      fish: "Zander",
      category: "bait",
      season: "winter",
      difficulty: "medium",
      description: "Stimulierend mit stabilen Fetten",
      ingredients: {
        "Fischmehl": 32,
        "Fleischmehl": 20,
        "Maiskeimöl": 18,
        "Fischöl": 18,
        "Muskelmehl": 10,
        "Paprika": 2
      },
      notes: "Etwas kräftiger als Sommer. Gute Langzeithaltung.",
      base_score: 81
    },
    {
      id: "pike-perch-spring-visual",
      name: "Zander Spring Visual",
      fish: "Zander",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Visuell optimierte Frühjahrs-Mischung mit Farbreizen",
      ingredients: {
        "Fischmehl": 30,
        "Maisgries": 20,
        "Fleischmehl": 15,
        "Fischöl": 16,
        "Dill": 8,
        "Sojamehl": 8,
        "Paprika": 3
      },
      notes: "Zander nutzen Sehsinn. Helle Farben und klare Struktur wichtig.",
      base_score: 78
    },
    {
      id: "pike-perch-summer-tender",
      name: "Zander Tender Touch",
      fish: "Zander",
      category: "bait",
      season: "summer",
      difficulty: "easy",
      description: "Sanfte Sommermischung für wählerische Exemplare",
      ingredients: {
        "Fischmehl": 26,
        "Maisgries": 20,
        "Fleischmehl": 14,
        "Sojaöl": 16,
        "Dill": 8,
        "Muskelmehl": 8,
        "Fischöl": 8
      },
      notes: "Für große, vorsichtige Zander im Sommer. Subtil aber effektiv.",
      base_score: 75
    },
    {
      id: "pike-perch-autumn-hunter",
      name: "Zander Herbst Hunter",
      fish: "Zander",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Aggressive Herbstmischung mit maximaler Jagdreizung",
      ingredients: {
        "Fischmehl": 34,
        "Fleischmehl": 22,
        "Maiskeimöl": 16,
        "Fischöl": 14,
        "Paprika": 6,
        "Dill": 4,
        "Schwarzkümmel": 4
      },
      notes: "September–Oktober: Zander sind super aggressiv. Höchste Fangerfolge.",
      base_score: 86
    }
  ],
  "Barsch": [
    {
      id: "perch-summer-small-bait",
      name: "Barsch-Mix Sommer",
      fish: "Barsch",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Kleine Köder mit attraktiven Lockstoffen",
      ingredients: {
        "Insektenmehl": 25,
        "Sojaöl": 20,
        "Hafermehl": 20,
        "Fischmehl": 20,
        "Honig": 10,
        "Vanille": 5
      },
      notes: "Sehr kleine Köder (10–15mm). Barsche sind Schwarmjäger.",
      base_score: 75
    },
    {
      id: "perch-allround",
      name: "Barsch Allround",
      fish: "Barsch",
      category: "bait",
      season: "allround",
      difficulty: "easy",
      description: "Schnelle, preiswerte Anfütterung",
      ingredients: {
        "Paniermehl": 30,
        "Insektenmehl": 20,
        "Sonnenblumenöl": 20,
        "Bierhefe": 15,
        "Zucker": 15
      },
      notes: "Barsche sind Opportunisten. Großmengen möglich.",
      base_score: 70
    },
    {
      id: "perch-spring-swarm",
      name: "Barsch Spring Schwarm",
      fish: "Barsch",
      category: "boilies",
      season: "summer",
      difficulty: "easy",
      description: "Schwarm-optimiert für Frühjahrs-Massenfütterung",
      ingredients: {
        "Insektenmehl": 26,
        "Fischmehl": 18,
        "Sojaöl": 18,
        "Hafermehl": 16,
        "Honig": 10,
        "Bierhefe": 8,
        "Vanille": 4
      },
      notes: "März–Mai: Barsch-Schwärme sind super aktiv. Kleine Köder (8–12mm).",
      base_score: 76
    },
    {
      id: "perch-summer-micro",
      name: "Barsch Micro Pellets",
      fish: "Barsch",
      category: "bait",
      season: "summer",
      difficulty: "easy",
      description: "Ultra-feinkörnige Micro-Pellets für Massenfütterung",
      ingredients: {
        "Paniermehl": 28,
        "Insektenmehl": 22,
        "Sonnenblumenöl": 18,
        "Bierhefe": 16,
        "Honig": 8,
        "Zucker": 8
      },
      notes: "Micro-Granulat lockt riesige Schwärme an. Schnelle Effektivität.",
      base_score: 73
    },
    {
      id: "perch-autumn-aggressive",
      name: "Barsch Herbst Aggro",
      fish: "Barsch",
      category: "boilies",
      season: "winter",
      difficulty: "medium",
      description: "Aggressive Herbst-Mischung für Maximal-Fänge",
      ingredients: {
        "Insektenmehl": 28,
        "Fischmehl": 20,
        "Sojaöl": 16,
        "Hafermehl": 12,
        "Honig": 8,
        "Bierhefe": 10,
        "Schwarzkümmel": 6
      },
      notes: "September–Oktober: Barsche sind besonders aggressiv. Höchste Fangraten.",
      base_score: 81
    }
  ],
  "Forelle": [
    {
      id: "trout-summer-delicate",
      name: "Forellen-Mix Sommer",
      fish: "Forelle",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Feine Mischung mit hoher Wasserlöslichkeit",
      ingredients: {
        "Fischmehl": 30,
        "Bierhefe": 20,
        "Hafermehl": 15,
        "Fischöl": 15,
        "Traubenzucker": 15,
        "Vitamin-C": 5
      },
      notes: "Forellen brauchen schnelle Lockstoff-Freisetzung. Temp-empfindlich.",
      base_score: 78
    },
    {
      id: "trout-winter-stimulating",
      name: "Forellen-Mix Winter",
      fish: "Forelle",
      category: "bait",
      season: "winter",
      difficulty: "hard",
      description: "Stimulierende Wintermischung für kalte Gewässer",
      ingredients: {
        "Fischmehl": 35,
        "Lebertran": 20,
        "Orangenschale": 10,
        "Fleischmehl": 20,
        "Maiskeimöl": 10,
        "Salz": 5
      },
      notes: "Nur für sehr kalte Gewässer (< 8°C). Intensive Duft.",
      base_score: 83
    },
    {
      id: "trout-spring-fresh",
      name: "Forelle Spring Frisch",
      fish: "Forelle",
      category: "boilies",
      season: "summer",
      difficulty: "medium",
      description: "Frische Frühjahrs-Mischung mit hoher Wasserlöslichkeit",
      ingredients: {
        "Fischmehl": 32,
        "Bierhefe": 18,
        "Hafermehl": 14,
        "Fischöl": 14,
        "Traubenzucker": 12,
        "Vitamin-C": 6,
        "Zitronenöl": 4
      },
      notes: "Forellen reagieren auf Vitamin C und natürliche Frische-Signale.",
      base_score: 80
    },
    {
      id: "trout-summer-flowfeed",
      name: "Forelle Flowfeed Powder",
      fish: "Forelle",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Pulverförmiges Futter mit schneller Freisetzung",
      ingredients: {
        "Fischmehl": 28,
        "Bierhefe": 22,
        "Paniermehl": 16,
        "Fischöl": 14,
        "Traubenzucker": 12,
        "Vitamin-C": 4,
        "Zitronenöl": 4
      },
      notes: "Schnelle Wolkenbildung in der Strömung. Perfekt für Bäche.",
      base_score: 77
    },
    {
      id: "trout-autumn-pre-winter",
      name: "Forelle Herbst Pre-Winter",
      fish: "Forelle",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Energiereiche Mischung für Herbst-Vorfütterung",
      ingredients: {
        "Fischmehl": 36,
        "Lebertran": 18,
        "Fleischmehl": 14,
        "Maiskeimöl": 12,
        "Bierhefe": 8,
        "Orangenschale": 8,
        "Salz": 4
      },
      notes: "September–Oktober: Hochkalorisch für Wintervorbereitung. Maximum Effekt.",
      base_score: 85
    }
  ],
  "Aal": [
    {
      id: "eel-summer-pungent",
      name: "Aal-Mix Sommer",
      fish: "Aal",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Intensiver, penetranter Duft mit organischen Stoffen",
      ingredients: {
        "Fleischmehl": 25,
        "Lebertran": 20,
        "Fischöl": 20,
        "Knoblauch": 15,
        "Würmer-Extract": 15,
        "Salz": 5
      },
      notes: "Aale sind Nachtschwimmer mit starkem Geruchssinn. Sehr starke Düfte.",
      base_score: 84
    },
    {
      id: "eel-allround-powerful",
      name: "Aal Ganzjahres",
      fish: "Aal",
      category: "bait",
      season: "allround",
      difficulty: "medium",
      description: "Stabile, durchgehend wirksame Mischung",
      ingredients: {
        "Fleischmehl": 30,
        "Lebertran": 25,
        "Würmer-Extract": 20,
        "Fischöl": 15,
        "Knoblauch": 10
      },
      notes: "Ganzjährig zuverlässig. Großmengen für Nacht-Sessionen.",
      base_score: 82
    },
    {
      id: "eel-summer-fishy",
      name: "Aal Fishy Explosion",
      fish: "Aal",
      category: "boilies",
      season: "summer",
      difficulty: "hard",
      description: "Fischiger Bombenmix mit ultra-starkem Duft",
      ingredients: {
        "Fleischmehl": 28,
        "Lebertran": 22,
        "Fischmehl": 16,
        "Fischöl": 16,
        "Knoblauch": 12,
        "Würmer-Extract": 4,
        "Salz": 2
      },
      notes: "Maximale Duft-Attraktion. Nachts sehr wirksam. Riecht penetrant.",
      base_score: 86
    },
    {
      id: "eel-spring-awakening",
      name: "Aal Spring Erwachen",
      fish: "Aal",
      category: "bait",
      season: "summer",
      difficulty: "medium",
      description: "Lockende Frühjahrs-Mischung für hungrige Aale",
      ingredients: {
        "Fleischmehl": 28,
        "Lebertran": 22,
        "Würmer-Extract": 18,
        "Fischöl": 14,
        "Knoblauch": 12,
        "Salz": 6
      },
      notes: "März–Mai: Aale kommen aus Winterschlaf. Starke Düfte locken Schwärme.",
      base_score: 83
    },
    {
      id: "eel-autumn-gorge",
      name: "Aal Herbst Völlerei",
      fish: "Aal",
      category: "boilies",
      season: "winter",
      difficulty: "hard",
      description: "Ultra-intensive Mischung für Herbst Massenfütterung",
      ingredients: {
        "Fleischmehl": 32,
        "Lebertran": 24,
        "Fischmehl": 14,
        "Fischöl": 12,
        "Knoblauch": 10,
        "Würmer-Extract": 4,
        "Spinnenöl": 2,
        "Salz": 2
      },
      notes: "September–Oktober: Ultimative Duft-Explosion. Größte Fangerfolge.",
      base_score: 89
    }
  ]
};

// Flaches Array für schnelle Iteration
export const RECIPE_LIST = Object.values(PREDEFINED_RECIPES)
  .flat()
  .map(recipe => ({
    ...recipe,
    isPredefined: true,
    totalPercentage: Object.values(recipe.ingredients).reduce((a, b) => a + b, 0)
  }));

// Hilfsfunktion: Rezept nach ID suchen
export const getRecipeById = (id) => RECIPE_LIST.find(r => r.id === id);

// Hilfsfunktion: Rezepte nach Jahreszeit filtern
export const getRecipesBySeason = (season) => {
  if (season === "allround") {
    return RECIPE_LIST;
  }
  return RECIPE_LIST.filter(r => r.season === season || r.season === "allround");
};

// Hilfsfunktion: Rezepte nach Fisch filtern
export const getRecipesByFish = (fish) => {
  return PREDEFINED_RECIPES[fish] || [];
};

// Schwierigkeitsgrade mit Farben für UI
export const DIFFICULTY_CONFIG = {
  easy: { label: "Leicht", color: "text-green-400", bg: "bg-green-900/30", icon: "⭐" },
  medium: { label: "Mittel", color: "text-yellow-400", bg: "bg-yellow-900/30", icon: "⭐⭐" },
  hard: { label: "Schwer", color: "text-red-400", bg: "bg-red-900/30", icon: "⭐⭐⭐" }
};

// Jahreszeiten mit Emojis
export const SEASON_CONFIG = {
  summer: { label: "Sommer", emoji: "☀️", temp_range: "18–24°C" },
  winter: { label: "Winter", emoji: "❄️", temp_range: "2–8°C" },
  allround: { label: "Ganzjahres", emoji: "🔄", temp_range: "5–20°C" }
};
