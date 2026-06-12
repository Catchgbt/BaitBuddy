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
