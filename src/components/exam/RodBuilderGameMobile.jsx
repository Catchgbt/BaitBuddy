import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { 
  Fish, 
  Target, 
  Award, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { FISH_SCENARIOS, EQUIPMENT } from "./rodBuilderData";

export default function RodBuilderGameMobile() {
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
  const [openDrawer, setOpenDrawer] = useState(null);
  const { triggerHaptic } = useHaptic();

  const handleEquipmentSelect = (category, itemId) => {
    triggerHaptic('light');
    setSelectedEquipment(prev => ({
      ...prev,
      [category]: itemId
    }));
    setOpenDrawer(null);
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
    
    const allSelected = Object.values(selectedEquipment).every(item => item !== null);
    
    if (!allSelected) {
      toast.warning("Bitte wähle alle Komponenten aus");
      return;
    }
    
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResult(true);
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

  const getSelectedItemName = (category) => {
    const itemId = selectedEquipment[category];
    if (!itemId) return null;
    const item = EQUIPMENT[category].find(i => i.id === itemId);
    return item ? `${item.name} - ${item.details}` : null;
  };

  if (!selectedFish) {
    return (
      <Card className="glass-morphism border-gray-800 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="w-6 h-6 text-emerald-400" />
            <span className="text-cyan-400">Ruten-Konfigurator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(FISH_SCENARIOS).map(([fishId, fish]) => (
              <Button
                key={fishId}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedFish(fishId);
                }}
                variant="outline"
                className="h-auto p-4 border-gray-700 justify-start"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{fish.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-white">{fish.name}</div>
                    <div className="text-xs text-gray-400">{fish.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const scenario = FISH_SCENARIOS[selectedFish];
  const allSelected = Object.values(selectedEquipment).every(item => item !== null);

  return (
    <Card className="glass-morphism border-gray-800 mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{scenario.icon}</span>
            <div>
              <div className="text-cyan-400">Ausrüstung für {scenario.name}</div>
              <div className="text-xs text-gray-400 font-normal">{scenario.description}</div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
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
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {Object.entries(EQUIPMENT).map(([category, items]) => (
          <Drawer key={category} open={openDrawer === category} onOpenChange={(open) => setOpenDrawer(open ? category : null)}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 border-gray-700"
              >
                <div className="text-left">
                  <div className="text-xs text-cyan-400">{getCategoryName(category)}</div>
                  <div className="text-sm text-white">
                    {getSelectedItemName(category) || `Wähle ${getCategoryName(category)}...`}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-gray-900 border-gray-800">
              <DrawerHeader>
                <DrawerTitle className="text-white">{getCategoryName(category)} wählen</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {items.map(item => (
                  <Button
                    key={item.id}
                    variant={selectedEquipment[category] === item.id ? "default" : "outline"}
                    className={`w-full justify-start h-auto py-3 ${
                      selectedEquipment[category] === item.id 
                        ? 'bg-cyan-600 hover:bg-cyan-700 border-cyan-500' 
                        : 'border-gray-700'
                    }`}
                    onClick={() => handleEquipmentSelect(category, item.id)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-70">{item.details}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={!allSelected}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Target className="w-4 h-4 mr-2" />
          Ausrüstung prüfen
        </Button>

        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className={`border-2 ${
                score >= 120 ? 'border-emerald-500 bg-emerald-500/10' :
                score >= 100 ? 'border-cyan-500 bg-cyan-500/10' :
                score >= 80 ? 'border-yellow-500 bg-yellow-500/10' :
                'border-red-500 bg-red-500/10'
              }`}>
                <CardContent className="p-4 text-center">
                  <Award className={`w-12 h-12 mx-auto mb-2 ${
                    score >= 120 ? 'text-emerald-400' :
                    score >= 100 ? 'text-cyan-400' :
                    score >= 80 ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                  <div className="text-3xl font-bold text-white">{score}</div>
                  <div className="text-sm text-gray-300">von 140 Punkten</div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}