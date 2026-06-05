import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WaterAnalysisTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'grundlagen',
      title: 'Grundlagen der Satellitenanalyse',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Die Satelliten-Gewässeranalyse nutzt multispektrale Daten von verschiedenen 
            Erdbeobachtungssatelliten, um wichtige Wassereigenschaften zu bestimmen.
          </p>
          
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-white">Verwendete Satellitensysteme:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2">
                <span className="text-cyan-400 flex-shrink-0">Sentinel-2/3:</span>
                <span>Optische Multispektralanalyse mit 10-60m Auflösung für Chlorophyll und Trübung</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 flex-shrink-0">MODIS Aqua/Terra:</span>
                <span>Tägliche Oberflächentemperatur-Messungen mit globaler Abdeckung</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">Copernicus Marine:</span>
                <span>Hochauflösende ozeanografische Daten und Wellenmodelle</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'parameter',
      title: 'Wichtige Wasser-Parameter',
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
              <h4 className="font-semibold text-cyan-400 mb-2">Wassertemperatur (SST)</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Die Oberflächentemperatur beeinflusst den Stoffwechsel und die Aktivität der Fische. 
                Optimale Temperaturen liegen je nach Fischart zwischen 12-22°C. Kaltes Wasser verlangsamt 
                den Metabolismus, warmes Wasser erhöht die Aktivität, kann aber bei über 25°C zu 
                Sauerstoffmangel führen.
              </p>
            </div>

            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-400 mb-2">Chlorophyll-a Konzentration</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Misst die Menge an Phytoplankton im Wasser. Hohe Werte bedeuten viel Nahrung 
                für Kleinfische, was wiederum Raubfische anzieht. Werte über 20 mg/m³ deuten auf 
                Algenblüten hin, was problematisch sein kann.
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">Trübung (Turbidity)</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Gemessen in NTU (Nephelometric Turbidity Units). Beeinflusst die Sichtweite unter 
                Wasser und das Jagdverhalten der Fische. Bei hoher Trübung (über 50 NTU) verlassen 
                sich Raubfische mehr auf Vibrationen und Geruch.
              </p>
            </div>

            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
              <h4 className="font-semibold text-purple-400 mb-2">Wellengang und Wind</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Windgeschwindigkeit und Wellenhöhe beeinflussen die Sauerstoffanreicherung und 
                die Durchmischung des Wassers. Moderate Wellen (0.3-0.8m) sind oft ideal, da sie 
                Nahrung aufwirbeln und die Fische aktiver werden lassen.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'interpretation',
      title: 'Daten richtig interpretieren',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Die Kombination verschiedener Parameter gibt Aufschluss über die Fangchancen:
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Optimale Bedingungen:</h4>
              <ul className="space-y-1 text-sm text-gray-300 ml-4">
                <li>Temperatur: 15-20°C</li>
                <li>Chlorophyll: 5-15 mg/m³</li>
                <li>Trübung: 10-30 NTU</li>
                <li>Wind: 5-15 km/h</li>
                <li>Wellenhöhe: 0.2-0.5m</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-amber-400 mb-2">Herausfordernde Bedingungen:</h4>
              <ul className="space-y-1 text-sm text-gray-300 ml-4">
                <li>Temperatur unter 8°C oder über 24°C</li>
                <li>Chlorophyll über 25 mg/m³ (Algenblüte)</li>
                <li>Trübung über 60 NTU (sehr trüb)</li>
                <li>Wind über 25 km/h</li>
                <li>Wellenhöhe über 1.0m</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Quality Score verstehen:</h4>
            <p className="text-sm text-gray-300 mb-3">
              Der automatisch berechnete Quality Score (0-100) kombiniert alle Parameter:
            </p>
            <ul className="space-y-1 text-sm text-gray-300 ml-4">
              <li>80-100: Ausgezeichnete Bedingungen, hohe Fangchancen</li>
              <li>60-79: Gute Bedingungen, lohnt sich</li>
              <li>40-59: Durchschnittlich, Geduld erforderlich</li>
              <li>20-39: Schwierig, erfahrene Angler gefragt</li>
              <li>0-19: Sehr schwierig, Alternative Spots erwägen</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'hotspots',
      title: 'Hotspot-Erkennung nutzen',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Die KI-gestützte Hotspot-Erkennung analysiert Satellitendaten im Umkreis von 5km 
            um deinen gewählten Spot und identifiziert die vielversprechendsten Bereiche.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-white mb-2">So funktioniert es:</h4>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal ml-5">
              <li>Analyse von Temperaturgradienten (Fische sammeln sich an Übergängen)</li>
              <li>Chlorophyll-Verteilung (zeigt Nahrungskonzentration)</li>
              <li>Bathymetrie-Daten (Tiefenstrukturen und Drop-offs)</li>
              <li>Strömungsmuster (wo sich Nahrung sammelt)</li>
              <li>Historische Fangdaten (wenn verfügbar)</li>
            </ol>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-400 mb-2">Hotspot-Kategorien:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <span className="font-semibold text-emerald-400">Premium Hotspot:</span> Beste Kombination aller Faktoren, höchste Priorität
              </li>
              <li>
                <span className="font-semibold text-cyan-400">Guter Hotspot:</span> Mehrere positive Indikatoren, empfehlenswert
              </li>
              <li>
                <span className="font-semibold text-blue-400">Potenzieller Hotspot:</span> Einige positive Faktoren, Versuch wert
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'vergleich',
      title: 'Spot-Vergleich durchführen',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Mit der Spot-Vergleichsfunktion kannst du mehrere Angelplätze gleichzeitig analysieren 
            und die besten Bedingungen für deinen nächsten Trip finden.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-white mb-2">Vorgehensweise:</h4>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal ml-5">
              <li>Wähle 2-4 gespeicherte Spots aus deiner Liste</li>
              <li>Klicke auf "Spots vergleichen"</li>
              <li>Betrachte die Radar-Charts für jeden Spot</li>
              <li>Prüfe die Gesamt-Scores und Empfehlungen</li>
              <li>Entscheide basierend auf Prioritäten (Temperatur, Wetterstabilität, etc.)</li>
            </ol>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-400 mb-2">Vergleichskriterien:</h4>
            <ul className="space-y-1 text-sm text-gray-300 ml-4">
              <li>Quality Score Gesamt</li>
              <li>Wassertemperatur und Trend</li>
              <li>Nahrungsverfügbarkeit (Chlorophyll)</li>
              <li>Wetterstabilität (Wind, Wellen)</li>
              <li>Sichtbedingungen (Trübung)</li>
              <li>Entfernung zu deinem Standort</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'export',
      title: 'Daten exportieren und teilen',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Alle Analysedaten können exportiert und mit Angelkollegen geteilt werden.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-white mb-2">Export-Optionen:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <span className="font-semibold text-blue-400">PDF-Report:</span> Professioneller Bericht mit allen Charts und Empfehlungen
              </li>
              <li>
                <span className="font-semibold text-emerald-400">JSON-Daten:</span> Rohdaten für eigene Analysen oder Integration
              </li>
              <li>
                <span className="font-semibold text-purple-400">Share-Link:</span> Direkt-Link zum Teilen der Analyse
              </li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Beste Praktiken:</h4>
            <ul className="space-y-1 text-sm text-gray-300 ml-4">
              <li>Analysiere Spots 1-2 Tage vor deinem Trip</li>
              <li>Speichere Analysen für Trend-Vergleiche</li>
              <li>Kombiniere mit lokalen Wetterdaten</li>
              <li>Beachte Tageszeiten (Morgen oft besser als Mittag)</li>
              <li>Prüfe historische Daten wenn verfügbar</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'tipps',
      title: 'Profi-Tipps und Hinweise',
      content: (
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-amber-400 mb-2">Wichtige Hinweise:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Satellitendaten haben eine Verzögerung von 1-3 Tagen</li>
              <li>Wolkenbedeckung kann Messungen beeinträchtigen</li>
              <li>Bei Binnengewässern sind Daten weniger präzise als bei großen Seen</li>
              <li>Kombiniere immer mit lokalen Beobachtungen</li>
            </ul>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-400 mb-2">Erweiterte Nutzung:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Verfolge Trends über mehrere Wochen</li>
              <li>Identifiziere saisonale Muster</li>
              <li>Korreliere mit eigenen Fangerfolgen</li>
              <li>Nutze Hotspot-Funktion für unbekannte Gewässer</li>
              <li>Teile Erkenntnisse mit der Community</li>
            </ul>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-400 mb-2">Fischart-spezifische Tipps:</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p className="font-semibold text-white">Raubfische (Hecht, Zander, Barsch):</p>
              <ul className="ml-4 space-y-1">
                <li>Bevorzugen moderate Trübung (20-40 NTU)</li>
                <li>Aktiv bei Temperaturen 12-18°C</li>
                <li>Jagen bei leichtem Wellengang</li>
              </ul>
              
              <p className="font-semibold text-white mt-3">Friedfische (Karpfen, Brassen):</p>
              <ul className="ml-4 space-y-1">
                <li>Tolerieren höhere Temperaturen (bis 24°C)</li>
                <li>Weniger Trübungs-empfindlich</li>
                <li>Bevorzugen ruhigere Bedingungen</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="glass-morphism border-blue-600/50 bg-blue-900/10">
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Detaillierte Analyse-Anleitung</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Lerne, wie du Satellitendaten richtig interpretierst
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </CardHeader>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800/70 transition-colors flex items-center justify-between text-left"
                  >
                    <span className="font-semibold text-white">{section.title}</span>
                    {activeSection === section.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-gray-900/30">
                          {section.content}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 leading-relaxed">
                  <span className="font-semibold text-white">Hinweis:</span> Diese Anleitung 
                  wird kontinuierlich erweitert. Bei Fragen zur Interpretation spezifischer 
                  Werte kannst du jederzeit den KI Chat-Buddy um Rat fragen.
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}