import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Fish, 
  Target, 
  Award, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { FISH_SCENARIOS, EQUIPMENT } from "./rodBuilderData";
import RodBuilderGameMobile from "./RodBuilderGameMobile";

export default function RodBuilderGame() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFish, setSelectedFish] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState({
    rod: null,
    reel: null,
    line: null,
    leader: null,
    swivel: null,
    lure: null,
    hook: null
  });
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const { triggerHaptic } = useHaptic();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <RodBuilderGameMobile />;
  }

  const handleFishSelect = (fishId) => {
    triggerHaptic('selection');
    setSelectedFish(fishId);
    setSelectedEquipment({
      rod: null,
      reel: null,
      line: null,
      leader: null,
      swivel: null,
      lure: null,
      hook: null
    });
    setShowResult(false);
    setScore(0);
  };

  const handleEquipmentSelect = (category, itemId) => {
    triggerHaptic('light');
    setSelectedEquipment(prev => ({
      ...prev,
      [category]: itemId
    }));
  };

  const calculateScore = () => {
    if (!selectedFish) return 0;
    
    const scenario = FISH_SCENARIOS[selectedFish];
    let totalScore = 0;
    
    Object.keys(selectedEquipment).forEach(category => {
      const selected = selectedEquipment[category];
      if (selected && scenario.points[category][selected]) {
        totalScore += scenario.points[category][selected];
      }
    });
    
    return totalScore;
  };

  const handleSubmit = () => {
    triggerHaptic('medium');
    
    // Check if all components are selected
    const allSelected = Object.values(selectedEquipment).every(item => item !== null);
    
    if (!allSelected) {
      toast.warning("Bitte wähle alle Komponenten aus!");
      return;
    }
    
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResult(true);
    
    if (finalScore >= 120) {
      toast.success("Perfekt! Exzellente Rutenzusammenstellung!");
    } else if (finalScore >= 100) {
      toast.success("Sehr gut! Fast perfekte Zusammenstellung!");
    } else if (finalScore >= 80) {
      toast.info("Gut! Solide Zusammenstellung mit Verbesserungspotenzial.");
    } else {
      toast.error("Das Setup passt nicht optimal zum Zielfisch.");
    }
  };

  const handleReset = () => {
    triggerHaptic('light');
    setSelectedFish(null);
    setSelectedEquipment({
      rod: null,
      reel: null,
      line: null,
      leader: null,
      swivel: null,
      lure: null,
      hook: null
    });
    setShowResult(false);
    setScore(0);
  };

  const getFeedback = () => {
    if (!selectedFish || !showResult) return null;
    
    const scenario = FISH_SCENARIOS[selectedFish];
    const feedback = [];
    
    Object.keys(selectedEquipment).forEach(category => {
      const selected = selectedEquipment[category];
      const optimal = scenario.optimal[category];
      const points = scenario.points[category][selected] || 0;
      
      if (selected === optimal) {
        feedback.push({
          category,
          status: 'perfect',
          message: `${getCategoryName(category)}: Perfekte Wahl!`,
          points
        });
      } else if (points >= 15) {
        feedback.push({
          category,
          status: 'good',
          message: `${getCategoryName(category)}: Gute Alternative!`,
          points
        });
      } else if (points >= 10) {
        feedback.push({
          category,
          status: 'ok',
          message: `${getCategoryName(category)}: Funktioniert, aber nicht optimal.`,
          points
        });
      } else {
        feedback.push({
          category,
          status: 'poor',
          message: `${getCategoryName(category)}: Nicht ideal für ${scenario.name}.`,
          points
        });
      }
    });
    
    return feedback;
  };

  const getCategoryName = (category) => {
    const names = {
      rod: "Rute",
      reel: "Rolle",
      line: "Hauptschnur",
      leader: "Vorfach",
      swivel: "Wirbel",
      lure: "Köder",
      hook: "Haken"
    };
    return names[category] || category;
  };

  // Fish Selection View
  if (!selectedFish) {
    return (
      <Card className="glass-morphism border-gray-800 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="w-6 h-6 text-emerald-400" />
            <span className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
              Ruten-Konfigurator
            </span>
            <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
              Praxistraining
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 text-sm mb-4">
            Wähle einen Zielfisch und stelle die perfekte Angel-Ausrüstung zusammen!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(FISH_SCENARIOS).map(([fishId, fish]) => (
              <motion.button
                key={fishId}
                onClick={() => handleFishSelect(fishId)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:bg-gray-700/70 hover:border-cyan-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{fish.icon}</span>
                  <h3 className="text-white font-bold">{fish.name}</h3>
                </div>
                <p className="text-gray-400 text-xs">{fish.description}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const scenario = FISH_SCENARIOS[selectedFish];
  const allSelected = Object.values(selectedEquipment).every(item => item !== null);
  const feedback = getFeedback();

  // Equipment Selection View
  return (
    <Card className="glass-morphism border-gray-800 mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-3xl">{scenario.icon}</span>
            <div>
              <div className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                Ausrüstung für {scenario.name}
              </div>
              <div className="text-xs text-gray-400 font-normal mt-1">
                {scenario.description}
              </div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Zurück
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Equipment Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(EQUIPMENT).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <label className="text-sm font-medium text-cyan-400">
                {getCategoryName(category)}
              </label>
              <select
                value={selectedEquipment[category] || ""}
                onChange={(e) => handleEquipmentSelect(category, e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Wähle {getCategoryName(category)}...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.details}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!allSelected}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
        >
          <Target className="w-4 h-4 mr-2" />
          Ausrüstung prüfen
        </Button>

        {/* Results */}
        <AnimatePresence>
          {showResult && feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Score Display */}
              <Card className={`border-2 ${
                score >= 120 ? 'border-emerald-500 bg-emerald-500/10' :
                score >= 100 ? 'border-cyan-500 bg-cyan-500/10' :
                score >= 80 ? 'border-yellow-500 bg-yellow-500/10' :
                'border-red-500 bg-red-500/10'
              }`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Award className={`w-8 h-8 ${
                      score >= 120 ? 'text-emerald-400' :
                      score >= 100 ? 'text-cyan-400' :
                      score >= 80 ? 'text-yellow-400' :
                      'text-red-400'
                    }`} />
                    <div>
                      <div className="text-3xl font-bold text-white">{score}</div>
                      <div className="text-sm text-gray-300">von 140 Punkten</div>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${
                    score >= 120 ? 'text-emerald-300' :
                    score >= 100 ? 'text-cyan-300' :
                    score >= 80 ? 'text-yellow-300' :
                    'text-red-300'
                  }`}>
                    {score >= 120 ? '🏆 Perfekt! Exzellente Zusammenstellung!' :
                     score >= 100 ? '⭐ Sehr gut! Fast perfekt!' :
                     score >= 80 ? '👍 Gut! Funktioniert!' :
                     '⚠️ Verbesserungsbedarf'}
                  </p>
                </CardContent>
              </Card>

              {/* Detailed Feedback */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Detailliertes Feedback
                </h4>
                {feedback.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    {item.status === 'perfect' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {item.status === 'good' && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                    {item.status === 'ok' && <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                    {item.status === 'poor' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <span className="text-sm text-gray-300 flex-1">{item.message}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.points} P.
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}