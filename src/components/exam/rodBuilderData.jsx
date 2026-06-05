// Shared data for RodBuilderGame
export const FISH_SCENARIOS = {
  hecht: {
    name: "Hecht",
    icon: "🦈",
    description: "Aggressiver Raubfisch mit scharfen Zähnen",
    optimal: {
      rod: "spinnrute_mh",
      reel: "stationaer_4000",
      line: "geflochten_015",
      leader: "stahl_30",
      swivel: "wirbel_20kg",
      lure: "wobbler_12cm",
      hook: "drilling_2"
    },
    points: {
      rod: { spinnrute_mh: 20, spinnrute_h: 15, spinnrute_l: 5 },
      reel: { stationaer_4000: 20, stationaer_3000: 15, baitcaster: 10 },
      line: { geflochten_015: 20, geflochten_020: 15, mono_035: 10 },
      leader: { stahl_30: 20, fluorocarbon_50: 5, mono_30: 0 },
      swivel: { wirbel_20kg: 15, wirbel_10kg: 10, wirbel_5kg: 5 },
      lure: { wobbler_12cm: 20, gummifisch_15cm: 18, spinner_10g: 12 },
      hook: { drilling_2: 15, drilling_4: 12, einzelhaken_1: 8 }
    }
  },
  zander: {
    name: "Zander",
    icon: "🐟",
    description: "Nachtaktiver Raubfisch, bevorzugt Grundnähe",
    optimal: {
      rod: "spinnrute_m",
      reel: "stationaer_3000",
      line: "geflochten_012",
      leader: "fluorocarbon_30",
      swivel: "wirbel_10kg",
      lure: "gummifisch_10cm",
      hook: "jighaken_2"
    },
    points: {
      rod: { spinnrute_m: 20, spinnrute_mh: 15, spinnrute_l: 10 },
      reel: { stationaer_3000: 20, stationaer_4000: 15, stationaer_2500: 12 },
      line: { geflochten_012: 20, geflochten_015: 15, mono_030: 10 },
      leader: { fluorocarbon_30: 20, fluorocarbon_40: 15, mono_30: 10 },
      swivel: { wirbel_10kg: 15, wirbel_20kg: 12, wirbel_5kg: 10 },
      lure: { gummifisch_10cm: 20, gummifisch_15cm: 15, wobbler_8cm: 12 },
      hook: { jighaken_2: 15, jighaken_1: 12, drilling_4: 8 }
    }
  },
  barsch: {
    name: "Barsch",
    icon: "🐠",
    description: "Kleinerer Raubfisch, filigranes Angeln",
    optimal: {
      rod: "spinnrute_l",
      reel: "stationaer_2500",
      line: "geflochten_008",
      leader: "fluorocarbon_20",
      swivel: "wirbel_5kg",
      lure: "gummifisch_5cm",
      hook: "jighaken_4"
    },
    points: {
      rod: { spinnrute_l: 20, spinnrute_ul: 18, spinnrute_m: 10 },
      reel: { stationaer_2500: 20, stationaer_2000: 18, stationaer_3000: 12 },
      line: { geflochten_008: 20, geflochten_010: 18, mono_025: 12 },
      leader: { fluorocarbon_20: 20, fluorocarbon_25: 15, mono_20: 10 },
      swivel: { wirbel_5kg: 15, wirbel_10kg: 12, wirbel_3kg: 10 },
      lure: { gummifisch_5cm: 20, spinner_5g: 18, wobbler_5cm: 15 },
      hook: { jighaken_4: 15, jighaken_6: 12, drilling_6: 10 }
    }
  },
  karpfen: {
    name: "Karpfen",
    icon: "🎣",
    description: "Friedfisch, stark und ausdauernd",
    optimal: {
      rod: "karpfenrute_35lb",
      reel: "freilauf_6000",
      line: "mono_035",
      leader: "vorfach_karpfen",
      swivel: "wirbel_20kg",
      lure: "boilie_20mm",
      hook: "karpfenhaken_4"
    },
    points: {
      rod: { karpfenrute_35lb: 20, karpfenrute_30lb: 18, spinnrute_h: 5 },
      reel: { freilauf_6000: 20, stationaer_6000: 15, stationaer_4000: 10 },
      line: { mono_035: 20, mono_040: 18, geflochten_020: 12 },
      leader: { vorfach_karpfen: 20, fluorocarbon_40: 12, mono_40: 10 },
      swivel: { wirbel_20kg: 15, wirbel_30kg: 12, wirbel_10kg: 8 },
      lure: { boilie_20mm: 20, mais: 15, pellets: 15 },
      hook: { karpfenhaken_4: 15, karpfenhaken_2: 12, einzelhaken_1: 10 }
    }
  },
  forelle: {
    name: "Bachforelle",
    icon: "🌊",
    description: "Salmonide, vorsichtiger Biss, klare Gewässer",
    optimal: {
      rod: "spinnrute_ul",
      reel: "stationaer_2000",
      line: "mono_020",
      leader: "fluorocarbon_15",
      swivel: "wirbel_3kg",
      lure: "spinner_3g",
      hook: "einzelhaken_8"
    },
    points: {
      rod: { spinnrute_ul: 20, spinnrute_l: 15, fliegenrute: 18 },
      reel: { stationaer_2000: 20, stationaer_2500: 15, fliegenrolle: 18 },
      line: { mono_020: 20, mono_025: 15, geflochten_008: 12 },
      leader: { fluorocarbon_15: 20, fluorocarbon_20: 15, mono_18: 12 },
      swivel: { wirbel_3kg: 15, wirbel_5kg: 12, wirbel_10kg: 8 },
      lure: { spinner_3g: 20, wobbler_5cm: 18, blinker_5g: 15 },
      hook: { einzelhaken_8: 15, einzelhaken_6: 12, drilling_8: 10 }
    }
  }
};

export const EQUIPMENT = {
  rod: [
    { id: "spinnrute_ul", name: "Spinnrute UL", details: "1,80m, 1-7g" },
    { id: "spinnrute_l", name: "Spinnrute L", details: "2,10m, 5-20g" },
    { id: "spinnrute_m", name: "Spinnrute M", details: "2,40m, 10-40g" },
    { id: "spinnrute_mh", name: "Spinnrute MH", details: "2,70m, 20-80g" },
    { id: "spinnrute_h", name: "Spinnrute H", details: "2,70m, 40-120g" },
    { id: "karpfenrute_30lb", name: "Karpfenrute 3,0lb", details: "3,60m" },
    { id: "karpfenrute_35lb", name: "Karpfenrute 3,5lb", details: "3,90m" },
    { id: "fliegenrute", name: "Fliegenrute", details: "2,70m, Klasse 5" }
  ],
  reel: [
    { id: "stationaer_2000", name: "Stationärrolle 2000", details: "Schnurfassung: 150m/0,20mm" },
    { id: "stationaer_2500", name: "Stationärrolle 2500", details: "Schnurfassung: 200m/0,25mm" },
    { id: "stationaer_3000", name: "Stationärrolle 3000", details: "Schnurfassung: 250m/0,30mm" },
    { id: "stationaer_4000", name: "Stationärrolle 4000", details: "Schnurfassung: 300m/0,35mm" },
    { id: "stationaer_6000", name: "Stationärrolle 6000", details: "Schnurfassung: 400m/0,40mm" },
    { id: "freilauf_6000", name: "Freilaufrolle 6000", details: "Mit Freilaufsystem" },
    { id: "baitcaster", name: "Baitcaster", details: "Multirolle" },
    { id: "fliegenrolle", name: "Fliegenrolle", details: "Backing + WF-Schnur" }
  ],
  line: [
    { id: "mono_020", name: "Monofil 0,20mm", details: "~4kg Tragkraft" },
    { id: "mono_025", name: "Monofil 0,25mm", details: "~6kg Tragkraft" },
    { id: "mono_030", name: "Monofil 0,30mm", details: "~8kg Tragkraft" },
    { id: "mono_035", name: "Monofil 0,35mm", details: "~10kg Tragkraft" },
    { id: "mono_040", name: "Monofil 0,40mm", details: "~12kg Tragkraft" },
    { id: "geflochten_008", name: "Geflochtene 0,08mm", details: "~5kg Tragkraft" },
    { id: "geflochten_010", name: "Geflochtene 0,10mm", details: "~8kg Tragkraft" },
    { id: "geflochten_012", name: "Geflochtene 0,12mm", details: "~10kg Tragkraft" },
    { id: "geflochten_015", name: "Geflochtene 0,15mm", details: "~13kg Tragkraft" },
    { id: "geflochten_020", name: "Geflochtene 0,20mm", details: "~18kg Tragkraft" }
  ],
  leader: [
    { id: "fluorocarbon_15", name: "Fluorocarbon 0,15mm", details: "~2kg, unsichtbar" },
    { id: "fluorocarbon_20", name: "Fluorocarbon 0,20mm", details: "~4kg, unsichtbar" },
    { id: "fluorocarbon_25", name: "Fluorocarbon 0,25mm", details: "~6kg, unsichtbar" },
    { id: "fluorocarbon_30", name: "Fluorocarbon 0,30mm", details: "~8kg, unsichtbar" },
    { id: "fluorocarbon_40", name: "Fluorocarbon 0,40mm", details: "~12kg, unsichtbar" },
    { id: "fluorocarbon_50", name: "Fluorocarbon 0,50mm", details: "~16kg, unsichtbar" },
    { id: "stahl_30", name: "Stahlvorfach 30cm", details: "~12kg, Hechtschutz" },
    { id: "stahl_50", name: "Stahlvorfach 50cm", details: "~15kg, Hechtschutz" },
    { id: "vorfach_karpfen", name: "Karpfenvorfach", details: "Kombi-Rig, 25cm" },
    { id: "mono_18", name: "Mono-Vorfach 0,18mm", details: "~3kg" },
    { id: "mono_20", name: "Mono-Vorfach 0,20mm", details: "~4kg" },
    { id: "mono_30", name: "Mono-Vorfach 0,30mm", details: "~8kg" },
    { id: "mono_40", name: "Mono-Vorfach 0,40mm", details: "~12kg" }
  ],
  swivel: [
    { id: "wirbel_3kg", name: "Wirbel 3kg", details: "Karabinerwirbel Gr. 12" },
    { id: "wirbel_5kg", name: "Wirbel 5kg", details: "Karabinerwirbel Gr. 10" },
    { id: "wirbel_10kg", name: "Wirbel 10kg", details: "Karabinerwirbel Gr. 8" },
    { id: "wirbel_20kg", name: "Wirbel 20kg", details: "Karabinerwirbel Gr. 4" },
    { id: "wirbel_30kg", name: "Wirbel 30kg", details: "Tönnchenwirbel Gr. 2" }
  ],
  lure: [
    { id: "wobbler_5cm", name: "Wobbler 5cm", details: "3-5g, Forelle/Barsch" },
    { id: "wobbler_8cm", name: "Wobbler 8cm", details: "8-12g, Zander/Barsch" },
    { id: "wobbler_12cm", name: "Wobbler 12cm", details: "15-25g, Hecht" },
    { id: "gummifisch_5cm", name: "Gummifisch 5cm", details: "2-5g, Barsch" },
    { id: "gummifisch_10cm", name: "Gummifisch 10cm", details: "10-20g, Zander" },
    { id: "gummifisch_15cm", name: "Gummifisch 15cm", details: "25-40g, Hecht" },
    { id: "spinner_3g", name: "Spinner 3g", details: "Forelle" },
    { id: "spinner_5g", name: "Spinner 5g", details: "Barsch" },
    { id: "spinner_10g", name: "Spinner 10g", details: "Hecht" },
    { id: "blinker_5g", name: "Blinker 5g", details: "Forelle/Saibling" },
    { id: "boilie_20mm", name: "Boilie 20mm", details: "Karpfen" },
    { id: "mais", name: "Mais", details: "Karpfen/Brassen" },
    { id: "pellets", name: "Pellets", details: "Karpfen" }
  ],
  hook: [
    { id: "einzelhaken_8", name: "Einzelhaken Gr. 8", details: "Klein, Forelle" },
    { id: "einzelhaken_6", name: "Einzelhaken Gr. 6", details: "Mittel, Barsch" },
    { id: "einzelhaken_4", name: "Einzelhaken Gr. 4", details: "Groß" },
    { id: "einzelhaken_1", name: "Einzelhaken Gr. 1", details: "Sehr groß, Hecht" },
    { id: "drilling_8", name: "Drilling Gr. 8", details: "Klein, Wobbler" },
    { id: "drilling_6", name: "Drilling Gr. 6", details: "Mittel, Wobbler" },
    { id: "drilling_4", name: "Drilling Gr. 4", details: "Groß, Wobbler" },
    { id: "drilling_2", name: "Drilling Gr. 2", details: "Sehr groß, Hecht" },
    { id: "jighaken_6", name: "Jighaken Gr. 6", details: "Klein, Barsch" },
    { id: "jighaken_4", name: "Jighaken Gr. 4", details: "Mittel, Barsch" },
    { id: "jighaken_2", name: "Jighaken Gr. 2", details: "Groß, Zander" },
    { id: "jighaken_1", name: "Jighaken Gr. 1", details: "Sehr groß" },
    { id: "karpfenhaken_6", name: "Karpfenhaken Gr. 6", details: "Klein" },
    { id: "karpfenhaken_4", name: "Karpfenhaken Gr. 4", details: "Standard" },
    { id: "karpfenhaken_2", name: "Karpfenhaken Gr. 2", details: "Groß" }
  ]
};