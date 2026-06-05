import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Fish, Ruler, Calendar, Info, Search, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RulesDisplay() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [expandedFish, setExpandedFish] = useState({});

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const rulesData = await base44.entities.RuleEntry.list();
      setRules(rulesData || []);
    } catch (error) {
      console.error("Fehler beim Laden der Regeln:", error);
    }
    setLoading(false);
  };

  // Einzigartige Regionen extrahieren
  const regions = [...new Set(rules.map(r => r.region).filter(Boolean))];

  // Filter anwenden
  const filteredRules = rules.filter(rule => {
    const matchesSearch = !searchTerm || 
      rule.fish?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.region?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = selectedRegion === "all" || rule.region === selectedRegion;
    
    return matchesSearch && matchesRegion;
  });

  // Nach Fischarten gruppieren
  const groupedByFish = filteredRules.reduce((acc, rule) => {
    const fishName = rule.fish || "Unbekannt";
    if (!acc[fishName]) {
      acc[fishName] = [];
    }
    acc[fishName].push(rule);
    return acc;
  }, {});

  // Sortiere Fischarten alphabetisch
  const sortedFishNames = Object.keys(groupedByFish).sort();

  // Ist gerade Schonzeit?
  const isInClosedSeason = (rule) => {
    if (!rule.closed_from || !rule.closed_to) return false;
    const today = new Date().toISOString().slice(0, 10);
    return today >= rule.closed_from && today <= rule.closed_to;
  };

  // Prüfe ob IRGENDEINE Regel für diesen Fisch aktuell Schonzeit hat
  const hasActiveClosedSeason = (fishRules) => {
    return fishRules.some(isInClosedSeason);
  };

  // Formatiere Datum für bessere Lesbarkeit
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  // Toggle Expansion
  const toggleFish = (fishName) => {
    setExpandedFish(prev => ({
      ...prev,
      [fishName]: !prev[fishName]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Fischarten</p>
                <p className="text-3xl font-bold text-cyan-400">{sortedFishNames.length}</p>
              </div>
              <Fish className="w-8 h-8 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Aktive Schonzeiten</p>
                <p className="text-3xl font-bold text-orange-400">
                  {rules.filter(isInClosedSeason).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 border-emerald-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Regionen</p>
                <p className="text-3xl font-bold text-emerald-400">{regions.length}</p>
              </div>
              <Info className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Regeln durchsuchen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Suche nach Fischart..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Region wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Regionen</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gruppierte Regeln nach Fischarten */}
      <div className="space-y-4">
        {sortedFishNames.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6 text-center text-gray-400">
              <Fish className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Regeln gefunden. Passe die Filter an.</p>
            </CardContent>
          </Card>
        ) : (
          sortedFishNames.map(fishName => {
            const fishRules = groupedByFish[fishName];
            const hasClosedSeason = hasActiveClosedSeason(fishRules);
            const isExpanded = expandedFish[fishName];

            return (
              <motion.div
                key={fishName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
                  <button
                    onClick={() => toggleFish(fishName)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Fish className="w-6 h-6 text-cyan-400" />
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{fishName}</h3>
                        <p className="text-sm text-gray-400">
                          {fishRules.length} {fishRules.length === 1 ? 'Regel' : 'Regeln'} in {[...new Set(fishRules.map(r => r.region))].length} {[...new Set(fishRules.map(r => r.region))].length === 1 ? 'Region' : 'Regionen'}
                        </p>
                      </div>
                      {hasClosedSeason && (
                        <Badge className="bg-orange-600 text-white ml-4">
                          <Calendar className="w-3 h-3 mr-1" />
                          Schonzeit aktiv
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-4 space-y-3 border-t border-gray-800">
                          {fishRules.map((rule, index) => (
                            <div
                              key={rule.id || index}
                              className={`p-4 rounded-lg ${
                                isInClosedSeason(rule)
                                  ? 'bg-orange-900/20 border border-orange-700/30'
                                  : 'bg-gray-800/30 border border-gray-700/30'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-white flex items-center gap-2">
                                    {rule.region}
                                    {isInClosedSeason(rule) && (
                                      <Badge className="bg-orange-600 text-white text-xs">
                                        Schonzeit
                                      </Badge>
                                    )}
                                  </h4>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {rule.min_size_cm && (
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <Ruler className="w-4 h-4 text-cyan-400" />
                                    <span>Mindestmaß: <strong className="text-white">{rule.min_size_cm} cm</strong></span>
                                  </div>
                                )}

                                {(rule.closed_from && rule.closed_to) && (
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <Calendar className="w-4 h-4 text-orange-400" />
                                    <span>
                                      Schonzeit: <strong className="text-white">{formatDate(rule.closed_from)} - {formatDate(rule.closed_to)}</strong>
                                    </span>
                                  </div>
                                )}

                                {rule.hook_limit && (
                                  <div className="flex items-center gap-2 text-gray-300 col-span-full">
                                    <Info className="w-4 h-4 text-blue-400" />
                                    <span>{rule.hook_limit}</span>
                                  </div>
                                )}

                                {rule.notes && (
                                  <div className="col-span-full text-gray-400 text-xs bg-gray-900/50 p-3 rounded">
                                    {rule.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}