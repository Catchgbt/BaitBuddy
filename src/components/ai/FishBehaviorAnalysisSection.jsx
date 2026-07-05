import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Fish, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ai } from "@/api/frontendClient";
import PlanGuard from "@/components/premium/PlanGuard";

export default function FishBehaviorAnalysisSection() {
  return (
    <PlanGuard requiredPlan="elite" featureName="Fischverhalts-Analyse">
      <FishBehaviorAnalysisSectionInner />
    </PlanGuard>
  );
}

function FishBehaviorAnalysisSectionInner() {
  const [species, setSpecies] = useState('Hecht');
  const [waterData, setWaterData] = useState({
    temperature: 18,
    ph_value: 7.5,
    clarity: 'mittel',
    oxygen: 8,
    nutrients: 'normal'
  });
  const [airPressure, setAirPressure] = useState(1013);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.log('Standort nicht verfügbar:', err)
      );
    }
  }, []);

  const handleAnalyze = async () => {
    if (!species.trim()) {
      toast.error('Bitte gib eine Fischart an');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ai.fishBehavior(
        species,
        waterData,
        airPressure,
        location.lat,
        location.lng
      );

      if (!response?.ok || !response?.data) {
        throw new Error('Keine gültige Antwort vom Server');
      }

      setResult(response.data);
      toast.success('Verhaltensanalyse abgeschlossen!');
    } catch (err) {
      const errorMsg = err?.message || 'Analyse fehlgeschlagen. Bitte versuche es später erneut.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaterDataChange = (key, value) => {
    setWaterData(prev => ({
      ...prev,
      [key]: value === '' ? null : value
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            <Fish className="w-6 h-6 text-emerald-400" />
            <span>Fischverhalts-Analyse</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fischart
              </label>
              <Input
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="z.B. Hecht, Zander, Forelle..."
                className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Luftdruck (hPa)
              </label>
              <Input
                type="number"
                value={airPressure}
                onChange={(e) => setAirPressure(parseFloat(e.target.value) || 1013)}
                placeholder="1013"
                className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                disabled={isLoading}
                step="0.1"
                min="950"
                max="1050"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Temperatur (°C)
              </label>
              <Input
                type="number"
                value={waterData.temperature || ''}
                onChange={(e) => handleWaterDataChange('temperature', e.target.value)}
                placeholder="18"
                className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                disabled={isLoading}
                step="0.1"
                min="0"
                max="40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                pH-Wert
              </label>
              <Input
                type="number"
                value={waterData.ph_value || ''}
                onChange={(e) => handleWaterDataChange('ph_value', e.target.value)}
                placeholder="7.5"
                className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                disabled={isLoading}
                step="0.1"
                min="5"
                max="9"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sauerstoffgehalt (mg/l)
              </label>
              <Input
                type="number"
                value={waterData.oxygen || ''}
                onChange={(e) => handleWaterDataChange('oxygen', e.target.value)}
                placeholder="8"
                className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                disabled={isLoading}
                step="0.1"
                min="0"
                max="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Klarheit
              </label>
              <select
                value={waterData.clarity || 'mittel'}
                onChange={(e) => handleWaterDataChange('clarity', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-lg px-3 py-2"
                disabled={isLoading}
              >
                <option value="sehr_klar">Sehr klar</option>
                <option value="klar">Klar</option>
                <option value="mittel">Mittel</option>
                <option value="trueb">Trüb</option>
                <option value="sehr_trueb">Sehr trüb</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nährstoffgehalt
              </label>
              <select
                value={waterData.nutrients || 'normal'}
                onChange={(e) => handleWaterDataChange('nutrients', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-lg px-3 py-2"
                disabled={isLoading}
              >
                <option value="sehr_gering">Sehr gering (oligotroph)</option>
                <option value="gering">Gering (oligotroph)</option>
                <option value="normal">Normal (mesotroph)</option>
                <option value="hoch">Hoch (eutroph)</option>
                <option value="sehr_hoch">Sehr hoch (polytrophisch)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !species.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse läuft...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Verhaltensanalyse starten
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="glass-morphism border-gray-800 rounded-2xl border-emerald-700/50">
          <CardHeader>
            <CardTitle className="text-emerald-400">
              Analyse für {result.species_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="text-sm font-medium text-cyan-400 mb-2">Aktivitätslevel</h3>
                <p className="text-lg font-bold text-emerald-400">
                  {result.activity_level}
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="text-sm font-medium text-cyan-400 mb-2">Luftdruck-Einfluss</h3>
                <p className="text-lg font-bold text-emerald-400">
                  {result.pressure_impact === 'positive' ? 'Positiv' : result.pressure_impact === 'negative' ? 'Negativ' : '- Neutral'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-cyan-400 mb-2">Verhaltenszusammenfassung</h3>
              <p className="text-gray-300 leading-relaxed">
                {result.behavior_summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-cyan-400 mb-2">Beste Angelzeiten</h3>
                <ul className="space-y-1">
                  {Array.isArray(result.best_times) && result.best_times.map((time, idx) => (
                    <li key={idx} className="text-gray-300 text-sm flex items-start">
                      {time}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-cyan-400 mb-2">Fütterungszonen</h3>
                <ul className="space-y-1">
                  {Array.isArray(result.feeding_zones) && result.feeding_zones.map((zone, idx) => (
                    <li key={idx} className="text-gray-300 text-sm flex items-start">
                      {zone}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-cyan-400 mb-2">Empfehlung Angeltiefe</h3>
              <p className="text-gray-300">
                {result.recommended_depth}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-cyan-400 mb-2">Köder-Empfehlungen</h3>
              <ul className="space-y-1">
                {Array.isArray(result.bait_recommendations) && result.bait_recommendations.map((bait, idx) => (
                  <li key={idx} className="text-gray-300 text-sm flex items-start">
                    <span className="text-emerald-400 mr-2">•</span> {bait}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-cyan-400 mb-2">Angeltechniken</h3>
              <ul className="space-y-1">
                {Array.isArray(result.techniques) && result.techniques.map((tech, idx) => (
                  <li key={idx} className="text-gray-300 text-sm flex items-start">
                    <span className="text-emerald-400 mr-2">•</span> {tech}
                  </li>
                ))}
              </ul>
            </div>

            {result.pressure_pressure_tips && (
              <div>
                <h3 className="text-sm font-medium text-cyan-400 mb-2">Luftdruck-Tipps</h3>
                <ul className="space-y-1">
                  {Array.isArray(result.pressure_pressure_tips) && result.pressure_pressure_tips.map((tip, idx) => (
                    <li key={idx} className="text-gray-300 text-sm flex items-start">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.water_conditions_notes && (
              <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Gewässerbedingungen</h3>
                <p className="text-gray-300 text-sm">
                  {result.water_conditions_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
