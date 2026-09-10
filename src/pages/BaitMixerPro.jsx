import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { integrations, events } from "@/api/frontendClient";
import { entities } from "@/api/frontendClient";
import { auth } from "@/api/auth";
import { useEventActivityTracking } from "@/hooks/useEventActivityTracking";
import ToolGuard from "@/components/progression/ToolGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Loader2,
  Sparkles,
  Save,
  Trash2,
  Heart,
  Zap,
  BookOpen,
  Download,
  Rotate3d,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import PrognosePanel from "@/components/baitmixer/PrognosePanel";
import RecipeBuilder from "@/components/baitmixer/RecipeBuilder";
import QuickStartGrid from "@/components/baitmixer/QuickStartGrid";
import { calculateSuccessRate } from "@/utils/baitPrognosis.utils";

const TABS = [
  { id: "quickstart", label: "Schnellstart", icon: "⭐" },
  { id: "builder", label: "Rezept-Editor", icon: "⚙️" },
  { id: "saved", label: "Meine Rezepte", icon: "💾" }
];

export default function BaitMixerPro() {
  useFeatureTracking("bait_recipe");
  const { trackBaitMixer } = useEventActivityTracking();
  const queryClient = useQueryClient();
  const { triggerHaptic } = useHaptic();

  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("quickstart");
  const [ingredients, setIngredients] = useState([]);
  const [mode, setMode] = useState("boilies");
  const [mix, setMix] = useState({});
  const [targetFish, setTargetFish] = useState("Karpfen");
  const [recipeName, setRecipeName] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [activeEventId, setActiveEventId] = useState(null);

  // Prognose-Parameter
  const [waterTemp, setWaterTemp] = useState(15);
  const [season, setSeason] = useState("allround");
  const [waterType, setWaterType] = useState("lake");
  const [prognosis, setPrognosis] = useState(null);

  // Favoriten
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("baitMixerFavorites");
    return saved ? JSON.parse(saved) : [];
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadActiveEvent = async () => {
      try {
        const event = await events.getActiveEvent();
        if (event?.active_event?.id) {
          setActiveEventId(event.active_event.id);
        }
      } catch {
        // Event loading non-critical
      }
    };
    loadActiveEvent();
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [mode]);

  // Berechne Prognose bei Änderungen
  useEffect(() => {
    if (ingredients.length > 0) {
      const prog = calculateSuccessRate(
        mix,
        ingredients,
        targetFish,
        waterTemp,
        season,
        waterType
      );
      setPrognosis(prog);
    }
  }, [mix, ingredients, targetFish, waterTemp, season, waterType]);

  const loadData = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
      await loadRecipes();
    } catch (error) {
      console.error("Failed to load user:", error);
    }
    setLoading(false);
  };

  const loadIngredients = async () => {
    try {
      const allIngredients = await entities.BaitIngredient.list();
      const filtered = allIngredients.filter(
        ing => ing.category === mode || ing.category === "both"
      );
      setIngredients(filtered);

      const initialMix = {};
      filtered.forEach(ing => {
        initialMix[ing.name] = 0;
      });
      setMix(initialMix);
      setAiAnalysis("");
      setRecipeName("");
    } catch (error) {
      console.error("Failed to load ingredients:", error);
      toast.error("Fehler beim Laden der Zutaten");
    }
  };

  const loadRecipes = () =>
    queryClient.invalidateQueries({ queryKey: ["baitRecipes"] });

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddIngredient = (ingredient, amount = 5) => {
    triggerHaptic("selection");
    setMix(prev => {
      const currentVal = prev[ingredient.name] || 0;
      const newVal = Math.min(
        Math.max(0, currentVal + amount),
        ingredient.max_percentage
      );
      return { ...prev, [ingredient.name]: newVal };
    });
  };

  const handleRemoveIngredient = ingredientName => {
    triggerHaptic("light");
    setMix(prev => ({ ...prev, [ingredientName]: 0 }));
  };

  const handleUpdatePercentage = (ingredientName, value) => {
    setMix(prev => ({ ...prev, [ingredientName]: value }));
  };

  const handleLoadRecipe = recipe => {
    setMode(recipe.category);
    setTargetFish(recipe.fish);
    setMix(recipe.ingredients || {});
    setRecipeName(recipe.name);
    setAiAnalysis(recipe.ai_analysis || "");
    setActiveTab("builder");
    triggerHaptic("selection");
    toast.success(`Rezept "${recipe.name}" geladen`);
  };

  const generateAIRecipe = async () => {
    try {
      setAiAnalyzing(true);
      triggerHaptic("medium");
      toast.info("KI-Buddy analysiert...");

      const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
      const currentMixForPrompt = Object.entries(mix)
        .filter(([_, val]) => val > 0)
        .map(([name, val]) => `- ${name}: ${val}%`)
        .join("\n");

      const prompt = `Du bist ein erfahrener Angel-Experte mit Spezialwissen über Köder-Herstellung.

**Auftrag:** Optimiere dieses ${mode === "boilies" ? "Boilie" : "Anfütterungs"}-Rezept für ${targetFish} bei ${waterTemp}°C und ${season} Bedingungen.

**Aktuelle Mischung:**
${currentMixForPrompt.length > 0 ? currentMixForPrompt : "Keine Zutaten hinzugefügt."}
**Gesamt:** ${totalPercentage}%

**Verfügbare Zutaten:**
${ingredients.map(ing => `- ${ing.name} (Max: ${ing.max_percentage}%, ${targetFish}-Attraktion: ${ing.fish_attractiveness?.[targetFish] || 0}/10)`).join("\n")}

**Aktuelle KI-Prognose:** Success-Rate ${prognosis?.successRate || 0}%

**Bitte optimiere:**
1. **Was ist gut?** Stärken des aktuellen Rezepts
2. **Was optimieren?** Schwächen und Verbesserungen
3. **Neues Rezept:** Konkrete neue Mischung (muss 100% ergeben!)
4. **Tipps:** Einsatz und Lagern

Sei konkret und praktisch!`;

      const response = await integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const analysis = response || "Keine Analyse verfügbar";
      setAiAnalysis(analysis);
      toast.success("KI-Analyse abgeschlossen!");
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast.error("KI-Analyse fehlgeschlagen");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const { data: recipes = [] } = useQuery({
    queryKey: ["baitRecipes"],
    queryFn: () => entities.BaitRecipe.list("-created_date")
  });

  const saveRecipeMutation = useOptimisticMutation({
    queryKey: "baitRecipes",
    mutationFn: data => entities.BaitRecipe.create(data),
    optimisticUpdate: (old = [], data) => [
      { id: `tmp-${Date.now()}`, ...data, isFavorite: false },
      ...old
    ],
    onSuccess: (_, data) => {
      triggerHaptic("success");
      toast.success("Rezept gespeichert!");
      setRecipeName("");
      setAiAnalysis("");
    },
    onError: () => toast.error("Fehler beim Speichern des Rezepts")
  });

  const deleteRecipeMutation = useOptimisticMutation({
    queryKey: "baitRecipes",
    mutationFn: id => entities.BaitRecipe.delete(id),
    optimisticUpdate: (old = [], id) => old.filter(r => r.id !== id),
    onSuccess: () => {
      triggerHaptic("warning");
      toast.success("Rezept gelöscht!");
    },
    onError: () => toast.error("Fehler beim Löschen des Rezepts")
  });

  const resetMix = () => {
    setMix(Object.keys(mix).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}));
    setRecipeName("");
    setAiAnalysis("");
    triggerHaptic("light");
  };

  const toggleFavorite = (recipeId) => {
    const updated = favorites.includes(recipeId)
      ? favorites.filter(id => id !== recipeId)
      : [...favorites, recipeId];
    setFavorites(updated);
    localStorage.setItem("baitMixerFavorites", JSON.stringify(updated));
    triggerHaptic("light");
  };

  const exportRecipe = () => {
    const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
    const exportData = {
      name: recipeName || "Rezept",
      fish: targetFish,
      category: mode,
      season,
      waterTemp,
      ingredients: Object.entries(mix)
        .filter(([_, val]) => val > 0)
        .map(([name, val]) => `${name}: ${val}%`)
        .join("\n"),
      totalPercentage,
      successRate: prognosis?.successRate || 0,
      exportDate: new Date().toLocaleString("de-DE")
    };

    const text = `
═══════════════════════════════════════
  KI-Köder-Mischer Pro Rezept-Export
═══════════════════════════════════════

Rezept: ${exportData.name}
Zielfisch: ${exportData.fish} | Typ: ${exportData.category}
Jahreszeit: ${exportData.season}
Wassertemperatur: ${exportData.waterTemp}°C
Success-Rate Prognose: ${exportData.successRate}%

───────────────────────────────────────
ZUTATEN (Gesamtmix: ${exportData.totalPercentage}%)
───────────────────────────────────────
${exportData.ingredients}

───────────────────────────────────────
TIPPS ZUM AUSMISCHEN:
───────────────────────────────────────
1. Wiege alle Zutaten sorgfältig ab
2. Mische Trockenzutaten zuerst
3. Füge Öle langsam hinzu
4. Knete die Masse gründlich durch
5. Lagere kühl und trocken

Exportiert: ${exportData.exportDate}
═══════════════════════════════════════
    `;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezept-${recipeName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rezept exportiert!");
    triggerHaptic("success");
  };

  const saveRecipe = () => {
    if (!recipeName.trim()) {
      toast.error("Bitte gib einen Namen für das Rezept ein");
      return;
    }
    const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
    if (totalPercentage === 0) {
      toast.error("Füge mindestens eine Zutat hinzu");
      return;
    }
    const attractivenessScore = Math.round(prognosis?.successRate || 0);
    const estimatedCost = Object.entries(mix).reduce((sum, [ingName, percentage]) => {
      const ingredient = ingredients.find(i => i.name === ingName);
      return sum + ((ingredient?.cost_per_kg || 0) * percentage / 100);
    }, 0);
    if (activeEventId) {
      trackBaitMixer(activeEventId);
    }
    saveRecipeMutation.mutate({
      name: recipeName.trim(),
      category: mode,
      target_fish: targetFish,
      ingredients: mix,
      total_percentage: totalPercentage,
      attractiveness_score: attractivenessScore,
      estimated_cost: Math.round(estimatedCost * 100) / 100,
      ai_generated: !!aiAnalysis,
      ai_analysis: aiAnalysis || ""
    });
  };

  const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
  const isValid = totalPercentage === 100;
  const activeIngredients = Object.entries(mix).filter(([_, val]) => val > 0);

  const pieData = activeIngredients.map(([name, value]) => ({
    name,
    value,
    percentage: value
  }));

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#FF6B9D"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <ToolGuard toolId="bait-mixer">
      <div className="min-h-screen bg-gray-950 px-3 py-4 sm:p-6 pb-32">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                KI-Köder-Mischer Pro
              </h1>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
            <p className="text-gray-400">
              Erstelle optimierte Boilies & Anfütterung mit KI-Prognose
            </p>
            <p className="text-xs text-green-400 mt-2">
              48 vordefinierte Premium-Rezepte • Favoriten • Export • Vollständig optimiert
            </p>
          </div>

          {/* Einstieg in die 3D-Köderanimation */}
          <Link
            to={createPageUrl("Koeder3D")}
            className="flex items-center gap-3 rounded-xl border border-cyan-800/60 bg-cyan-950/30 p-4 transition-colors hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Rotate3d className="h-8 w-8 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="flex-1 text-left">
              <span className="block font-semibold text-white">Köderführung in 3D ansehen</span>
              <span className="block text-sm text-gray-400">
                Wobbler, Gummifisch, Spinner, Blinker und Oberflächenköder mit echtem Laufverhalten
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
          </Link>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-800">
            {TABS.map(tab => (
              <button type="button"
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  triggerHaptic("light");
                }}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-cyan-400 border-cyan-400"
                    : "text-gray-400 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* QUICKSTART TAB */}
          {activeTab === "quickstart" && (
            <QuickStartGrid
              ingredients={ingredients}
              onLoadRecipe={handleLoadRecipe}
              waterTemp={waterTemp}
              season={season}
              waterType={waterType}
            />
          )}

          {/* BUILDER TAB */}
          {activeTab === "builder" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Modus & Zielfisch */}
                <Card className="glass-morphism border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-cyan-400">Modus & Zielfisch</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">
                        Kö der-Typ
                      </label>
                      <MobileSelect
                        value={mode}
                        onValueChange={setMode}
                        options={[
                          { value: "boilies", label: "Boilies" },
                          { value: "bait", label: "Anfütterung" }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">
                        Zielfisch
                      </label>
                      <MobileSelect
                        value={targetFish}
                        onValueChange={setTargetFish}
                        options={[
                          "Karpfen",
                          "Brassen",
                          "Rotauge",
                          "Hecht",
                          "Zander",
                          "Barsch",
                          "Forelle",
                          "Aal"
                        ].map(fish => ({
                          value: fish,
                          label: fish
                        }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Rezept-Editor */}
                <RecipeBuilder
                  ingredients={ingredients}
                  mix={mix}
                  onAddIngredient={handleAddIngredient}
                  onRemoveIngredient={handleRemoveIngredient}
                  onUpdatePercentage={handleUpdatePercentage}
                  totalPercentage={totalPercentage}
                  targetFish={targetFish}
                />

                {/* KI-Optimierung */}
                {activeIngredients.length > 0 && (
                  <Card className="glass-morphism border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        KI-Optimierung
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={generateAIRecipe}
                        disabled={aiAnalyzing}
                        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                      >
                        {aiAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            KI analysiert...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Rezept optimieren
                          </>
                        )}
                      </Button>

                      {aiAnalysis && (
                        <div className="p-4 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border border-cyan-600/30 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                              {aiAnalysis}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Rezept speichern */}
                {activeIngredients.length > 0 && (
                  <Card className="glass-morphism border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-cyan-400">Rezept speichern</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        placeholder="Rezeptname (z.B. Karpfen-Mix Sommer)"
                        value={recipeName}
                        onChange={e => setRecipeName(e.target.value)}
                        className="bg-gray-800/50 border-gray-700"
                      />
                      <div className="flex gap-3">
                        <Button
                          onClick={saveRecipe}
                          disabled={!recipeName.trim()}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Speichern
                        </Button>
                        <Button
                          onClick={exportRecipe}
                          disabled={!recipeName.trim() || totalPercentage === 0}
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:text-cyan-400"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportieren
                        </Button>
                        <Button
                          onClick={resetMix}
                          variant="outline"
                          className="border-gray-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Rechte Seite: Prognose + Visualisierungen */}
              <div className="space-y-6">
                {activeIngredients.length > 0 && (
                  <>
                    {/* Mischungsverhältnis */}
                    <Card className="glass-morphism border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-cyan-400 text-sm">
                          Mischungsverhältnis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={entry => `${entry.name}: ${entry.value}%`}
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Prognose-Panel */}
                <PrognosePanel
                  prognosis={prognosis}
                  waterTemp={waterTemp}
                  onWaterTempChange={setWaterTemp}
                  season={season}
                  onSeasonChange={setSeason}
                  waterType={waterType}
                  onWaterTypeChange={setWaterType}
                />
              </div>
            </div>
          )}

          {/* SAVED RECIPES TAB */}
          {activeTab === "saved" && (
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Meine Rezepte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recipes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>Noch keine Rezepte gespeichert</div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipes.map(recipe => {
                      const isFav = favorites.includes(recipe.id);
                      return (
                        <Card
                          key={recipe.id}
                          className="glass-morphism border-gray-800 hover:border-cyan-600/50 transition-all cursor-pointer group"
                          onClick={() => handleLoadRecipe(recipe)}
                        >
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm group-hover:text-cyan-400">
                                  {recipe.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                  {recipe.target_fish} • {recipe.category}
                                </p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-7 w-7 ${
                                    isFav
                                      ? "text-red-400"
                                      : "text-gray-400 hover:text-red-400"
                                  }`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleFavorite(recipe.id);
                                  }}
                                >
                                  <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-gray-400 hover:text-cyan-400"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setMix(recipe.ingredients);
                                    setRecipeName(recipe.name);
                                    exportRecipe();
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-400 hover:text-red-300"
                                  onClick={e => {
                                    e.stopPropagation();
                                    deleteRecipeMutation.mutate(recipe.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                Score: {recipe.attractiveness_score}
                              </span>
                              {recipe.ai_generated && (
                                <Sparkles className="w-3 h-3 text-purple-400" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ToolGuard>
  );
}
