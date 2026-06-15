
import React, { useState, useEffect, useCallback } from "react";
import { Gear, Spot } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  MapPin,
  Fish,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Target,
  Clock,
  Thermometer,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";

export default function StartFishing() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState("");
  const [targetFish, setTargetFish] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");
  const [spots, setSpots] = useState([]);
  const [gear, setGear] = useState([]);
  const [gearCheck, setGearCheck] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const steps = [
    { title: "Angelplatz", icon: MapPin, description: "Wähle deinen Spot" },
    { title: "Zielfisch", icon: Fish, description: "Was möchtest du fangen?" },
    { title: "Ausrüstung", icon: Package, description: "Prüfe deine Ausrüstung" },
    { title: "Los geht's", icon: Play, description: "Session starten" }
  ];

  const fishSpecies = [
    "Hecht", "Zander", "Barsch", "Karpfen", "Schleie", 
    "Forelle", "Äsche", "Wels", "Brassen", "Rotauge"
  ];

  const sessionDurations = [
    { value: "2", label: "Kurze Session (2h)" },
    { value: "4", label: "Halber Tag (4h)" },
    { value: "8", label: "Ganzer Tag (8h)" },
    { value: "24", label: "Übernachtung (24h)" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [spotsData, gearData] = await Promise.all([
        Spot.list(),
        Gear.list()
      ]);
      setSpots(spotsData);
      setGear(gearData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const performGearCheck = useCallback(async () => {
    if (!selectedSpot || !targetFish) return;

    setIsAnalyzing(true);
    
    const selectedSpotData = spots.find(s => s.id === selectedSpot);
    const gearList = gear.map(g => `${g.name} (${g.type}): ${g.specifications || 'keine Details'}`).join(', ');

    try {
      const prompt = `Analysiere die Angelausrüstung für diese Situation:

Angelplatz: ${selectedSpotData?.name} (${selectedSpotData?.water_type})
Zielfisch: ${targetFish}
Verfügbare Ausrüstung: ${gearList}

Bewerte jedes Ausrüstungsteil mit:
- "ideal" - perfekt geeignet
- "geeignet" - funktioniert gut
- "bedingt" - nicht optimal aber verwendbar
- "ungeeignet" - nicht empfohlen

Gib auch 3-5 konkrete Handlungstipps für diese spezifische Situation.

Antwort im JSON-Format:
{
  "gear_ratings": {
    "gear_id": "bewertung"
  },
  "tips": ["tipp1", "tipp2", "tipp3"],
  "weather_advice": "wetterabhängiger ratschlag",
  "best_time": "beste tageszeit"
}`;

      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            gear_ratings: { type: "object" },
            tips: { type: "array", items: { type: "string" } },
            weather_advice: { type: "string" },
            best_time: { type: "string" }
          }
        }
      });

      setRecommendations(response);
      
      // Map gear ratings
      const gearCheckResults = {};
      gear.forEach(item => {
        const rating = response.gear_ratings?.[item.id] || "geeignet";
        gearCheckResults[item.id] = {
          rating,
          suitable: ["ideal", "geeignet"].includes(rating)
        };
      });
      setGearCheck(gearCheckResults);

    } catch (error) {
      console.error("Error analyzing gear:", error);
      // Fallback gear check
      const fallbackCheck = {};
      gear.forEach(item => {
        fallbackCheck[item.id] = {
          rating: "geeignet",
          suitable: true
        };
      });
      setGearCheck(fallbackCheck);
    }
    
    setIsAnalyzing(false);
  }, [selectedSpot, targetFish, spots, gear]);

  useEffect(() => {
    if (currentStep === 2 && selectedSpot && targetFish) {
      performGearCheck();
    }
  }, [currentStep, selectedSpot, targetFish, performGearCheck]);

  const getRatingColor = (rating) => {
    switch (rating) {
      case "ideal": return "text-green-400";
      case "geeignet": return "text-emerald-400";
      case "bedingt": return "text-yellow-400";
      case "ungeeignet": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case "ideal":
      case "geeignet":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "bedingt":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "ungeeignet":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const startSession = async () => {
    setSessionStarted(true);
    // Here you could create a fishing session record
    setTimeout(() => {
      alert("Angel-Session gestartet! Viel Erfolg am Wasser! 🎣");
    }, 1000);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedSpot;
      case 1: return targetFish;
      case 2: return Object.keys(gearCheck).length > 0;
      default: return true;
    }
  };

  if (sessionStarted) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="glass-effect border-gray-700 text-center">
            <CardContent className="p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Fish className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-4">Session gestartet!</h1>
              <p className="text-gray-300 mb-6">
                Deine Angel-Session für {targetFish} ist aktiv. 
                Vergiss nicht, deine Fänge im Fangbuch zu dokumentieren!
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <strong className="text-emerald-400">Spot:</strong>
                  <p>{spots.find(s => s.id === selectedSpot)?.name}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <strong className="text-blue-400">Zielfisch:</strong>
                  <p>{targetFish}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Start Fishing</h1>
          <p className="text-gray-300">Bereite deine Angel-Session optimal vor</p>
        </div>

        {/* Progress */}
        <Card className="glass-effect border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    index <= currentStep 
                      ? 'bg-emerald-600' 
                      : 'bg-gray-700'
                  }`}>
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${
                      index <= currentStep ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 0: Select Spot */}
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-effect border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5" />
                    Angelplatz auswählen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={selectedSpot} onValueChange={setSelectedSpot}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle einen Angelplatz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {spots.map((spot) => (
                          <SelectItem key={spot.id} value={spot.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{spot.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {spot.water_type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedSpot && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">Spot Details:</h4>
                        <div className="text-sm text-gray-300">
                          {spots.find(s => s.id === selectedSpot)?.notes || "Keine weiteren Informationen"}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Select Target Fish */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-effect border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Fish className="w-5 h-5" />
                    Zielfisch wählen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={targetFish} onValueChange={setTargetFish}>
                      <SelectTrigger>
                        <SelectValue placeholder="Welchen Fisch möchtest du fangen?" />
                      </SelectTrigger>
                      <SelectContent>
                        {fishSpecies.map((fish) => (
                          <SelectItem key={fish} value={fish}>
                            {fish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Session-Dauer</label>
                      <Select value={sessionDuration} onValueChange={setSessionDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wie lange möchtest du angeln?" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessionDurations.map((duration) => (
                            <SelectItem key={duration.value} value={duration.value}>
                              {duration.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Gear Check */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-effect border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Package className="w-5 h-5" />
                    Ausrüstungs-Check
                    {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
                      <p className="text-gray-300">KI analysiert deine Ausrüstung...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {gear.map((item) => {
                        const check = gearCheck[item.id];
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              {getRatingIcon(check?.rating)}
                              <div>
                                <div className="font-medium text-white">{item.name}</div>
                                <div className="text-sm text-gray-400">{item.type}</div>
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={getRatingColor(check?.rating)}
                            >
                              {check?.rating || 'Wird analysiert...'}
                            </Badge>
                          </div>
                        );
                      })}

                      {recommendations && (
                        <div className="mt-6 space-y-4">
                          {/* AI Tips */}
                          <Alert className="border-emerald-500 bg-emerald-500/10">
                            <Lightbulb className="h-4 w-4" />
                            <AlertDescription className="text-emerald-200">
                              <strong>KI-Tipps für deine Session:</strong>
                              <ul className="mt-2 space-y-1 text-sm">
                                {recommendations.tips?.map((tip, index) => (
                                  <li key={index}>• {tip}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>

                          {/* Weather & Time advice */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {recommendations.weather_advice && (
                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-400 mb-1">
                                  <Thermometer className="w-4 h-4" />
                                  <strong>Wetter-Tipp:</strong>
                                </div>
                                <p className="text-sm text-blue-200">{recommendations.weather_advice}</p>
                              </div>
                            )}
                            {recommendations.best_time && (
                              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-purple-400 mb-1">
                                  <Clock className="w-4 h-4" />
                                  <strong>Beste Zeit:</strong>
                                </div>
                                <p className="text-sm text-purple-200">{recommendations.best_time}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Ready to Start */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-effect border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="w-5 h-5" />
                    Bereit zum Angeln!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Session-Zusammenfassung
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <MapPin className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                          <div className="font-medium text-white">Spot</div>
                          <div className="text-sm text-gray-300">
                            {spots.find(s => s.id === selectedSpot)?.name}
                          </div>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <Fish className="w-6 h-6 text-green-400 mx-auto mb-2" />
                          <div className="font-medium text-white">Zielfisch</div>
                          <div className="text-sm text-gray-300">{targetFish}</div>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                          <div className="font-medium text-white">Dauer</div>
                          <div className="text-sm text-gray-300">
                            {sessionDurations.find(d => d.value === sessionDuration)?.label || "Nicht gesetzt"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={startSession}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-3"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Angel-Session starten
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            variant="outline"
          >
            Zurück
          </Button>
          <Button 
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={!canProceed() || currentStep === steps.length - 1}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}
