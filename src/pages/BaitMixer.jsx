import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { Loader2, Sparkles, Save, Trash2, Plus, Minus, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function BaitMixerPage() {
  useFeatureTracking("bait_recipe");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState([]);
  const [mode, setMode] = useState("boilies");
  const [mix, setMix] = useState({});
  const [targetFish, setTargetFish] = useState("Karpfen");
  const [recipeName, setRecipeName] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  
  const { triggerHaptic } = useHaptic();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [mode]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      await loadRecipes();
    } catch (error) {
      console.error("Failed to load user:", error);
    }
    setLoading(false);
  };

  const loadIngredients = async () => {
    try {
      const allIngredients = await base44.entities.BaitIngredient.list();
      const filtered = allIngredients.filter(ing => 
        ing.category === mode || ing.category === "both"
      );
      setIngredients(filtered);
      
      const initialMix = {};
      filtered.forEach(ing => {
        initialMix[ing.name] = 0;
      });
      setMix(initialMix);
      // Also clear AI analysis and recipe name when mode changes, providing a clean slate
      setAiAnalysis("");
      setRecipeName("");

    } catch (error) {
      console.error("Failed to load ingredients:", error);
      toast.error("Fehler beim Laden der Zutaten");
    }
  };

  // Replaced with useQuery below - stub kept for loadData compatibility
  const loadRecipes = () => queryClient.invalidateQueries({ queryKey: ['baitRecipes'] });

  const handleAddIngredient = (ingredient, amount = 5) => {
    triggerHaptic('selection');
    setMix(prev => {
      const currentVal = prev[ingredient.name] || 0;
      // Ensure the new value is not negative and does not exceed max_percentage
      const newVal = Math.min(Math.max(0, currentVal + amount), ingredient.max_percentage);
      return { ...prev, [ingredient.name]: newVal };
    });
  };

  const handleRemoveIngredient = (ingredientName) => {
    triggerHaptic('light');
    setMix(prev => ({ ...prev, [ingredientName]: 0 }));
  };

  const calculateFishAttractiveness = () => {
    const fishTypes = ["Karpfen", "Brassen", "Rotauge", "Hecht", "Zander", "Barsch", "Forelle", "Aal"];
    const scores = {};
    
    fishTypes.forEach(fish => {
      scores[fish] = 0;
      Object.entries(mix).forEach(([ingName, percentage]) => {
        const ingredient = ingredients.find(i => i.name === ingName);
        if (ingredient && percentage > 0) {
          const attractiveness = ingredient.fish_attractiveness?.[fish] || 0;
          scores[fish] += (attractiveness * percentage) / 10;
        }
      });
    });
    
    return scores;
  };

  const generateAIRecipe = async () => {
    try {
      setAiAnalyzing(true);
      triggerHaptic('medium');
      toast.info("KI-Buddy analysiert...");

      const fishScores = calculateFishAttractiveness();
      const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);

      // Filter out ingredients with 0% for the prompt
      const currentMixForPrompt = Object.entries(mix)
                                    .filter(([_, val]) => val > 0)
                                    .map(([name, val]) => `- ${name}: ${val}%`)
                                    .join('\n');

      const prompt = `Du bist ein erfahrener Angel-Experte mit Spezialwissen über Köder-Herstellung.

**Auftrag:** Analysiere dieses ${mode === 'boilies' ? 'Boilie' : 'Anfütterungs'}-Rezept für ${targetFish} und gib Verbesserungsvorschläge.

**Aktuelle Mischung:**
${currentMixForPrompt.length > 0 ? currentMixForPrompt : "Keine Zutaten hinzugefügt."}
**Gesamt:** ${totalPercentage}%

**Verfügbare Zutaten:**
${ingredients.map(ing => `- ${ing.name} (Max: ${ing.max_percentage}%, ${targetFish}-Attraktion: ${ing.fish_attractiveness?.[targetFish] || 0}/10)`).join('\n')}

**Bitte analysiere:**
1. **Stärken:** Was ist gut am aktuellen Rezept?
2. **Schwächen:** Was fehlt oder ist suboptimal?
3. **Optimiertes Rezept:** Schlage eine verbesserte Mischung vor (muss genau 100% ergeben!)
4. **Anwendungstipps:** Wie sollte der Köder eingesetzt werden?

Sei konkret, praxisnah und berechne die optimale Mischung!`;

      const response = await base44.integrations.Core.InvokeLLM({
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
    queryKey: ['baitRecipes'],
    queryFn: () => base44.entities.BaitRecipe.list('-created_date'),
  });

  const saveRecipeMutation = useOptimisticMutation({
    queryKey: 'baitRecipes',
    mutationFn: (data) => base44.entities.BaitRecipe.create(data),
    optimisticUpdate: (old = [], data) => [{ id: `tmp-${Date.now()}`, ...data }, ...old],
    onSuccess: () => {
      triggerHaptic('success');
      toast.success(`Rezept gespeichert!`);
      setRecipeName('');
      setAiAnalysis('');
    },
    onError: () => toast.error('Fehler beim Speichern des Rezepts'),
  });

  const deleteRecipeMutation = useOptimisticMutation({
    queryKey: 'baitRecipes',
    mutationFn: (id) => base44.entities.BaitRecipe.delete(id),
    optimisticUpdate: (old = [], id) => old.filter((r) => r.id !== id),
    onSuccess: () => { triggerHaptic('warning'); toast.success('Rezept geloescht!'); },
    onError: () => toast.error('Fehler beim Loeschen des Rezepts'),
  });

  const resetMix = () => {
    setMix(Object.keys(mix).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}));
    setRecipeName("");
    setAiAnalysis("");
    triggerHaptic('light');
  };

  const saveRecipe = () => {
    if (!recipeName.trim()) {
      toast.error("Bitte gib einen Namen fuer das Rezept ein");
      return;
    }
    const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
    if (totalPercentage === 0) {
      toast.error("Fuege mindestens eine Zutat hinzu");
      return;
    }
    const fishScores = calculateFishAttractiveness();
    const attractivenessScore = Math.round(fishScores[targetFish] || 0);
    const estimatedCost = Object.entries(mix).reduce((sum, [ingName, percentage]) => {
      const ingredient = ingredients.find((i) => i.name === ingName);
      return sum + ((ingredient?.cost_per_kg || 0) * percentage / 100);
    }, 0);
    saveRecipeMutation.mutate({
      name: recipeName.trim(),
      category: mode,
      target_fish: targetFish,
      ingredients: mix,
      total_percentage: totalPercentage,
      attractiveness_score: attractivenessScore,
      estimated_cost: Math.round(estimatedCost * 100) / 100,
      ai_generated: !!aiAnalysis,
      ai_analysis: aiAnalysis || "",
    });
  };

  const loadRecipe = (recipe) => {
    setMode(recipe.category);
    setTargetFish(recipe.target_fish);
    setMix(recipe.ingredients);
    setRecipeName(recipe.name);
    setAiAnalysis(recipe.ai_analysis || "");
    triggerHaptic('selection');
    toast.success(`Rezept "${recipe.name}" geladen`);
  };

  const totalPercentage = Object.values(mix).reduce((sum, val) => sum + val, 0);
  const isValid = totalPercentage === 100;
  const activeIngredients = Object.entries(mix).filter(([_, val]) => val > 0);

  const pieData = activeIngredients.map(([name, value]) => ({
    name,
    value,
    percentage: value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

  const fishScores = calculateFishAttractiveness();
  const barData = Object.entries(fishScores).map(([fish, score]) => ({
    fish,
    score: Math.round(score * 10) / 10
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <PremiumGuard user={user} requiredPlan="basic" feature="KI-Köder-Mischer">
      <div className="min-h-screen bg-gray-950 px-3 py-4 sm:p-6 pb-32">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
              KI-Köder-Mischer
            </h1>
            <p className="text-gray-400">
              Erstelle optimierte Boilies & Anfütterung mit KI-Unterstützung
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <Card className="glass-morphism border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400">Modus & Zielfisch</CardTitle>
                    <MobileSelect 
                      value={mode} 
                      onValueChange={(val) => setMode(val)}
                      options={[
                        { value: 'boilies', label: 'Boilies' },
                        { value: 'bait', label: 'Anfuetterung' }
                      ]}
                      label="Modus"
                      placeholder="Modus waehlen"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Zielfisch</label>
                      <MobileSelect 
                        value={targetFish} 
                        onValueChange={setTargetFish}
                        options={["Karpfen", "Brassen", "Rotauge", "Hecht", "Zander", "Barsch", "Forelle", "Aal"].map(fish => ({
                          value: fish,
                          label: fish
                        }))}
                        placeholder="Zielfisch wählen"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-gray-800">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Verfügbare Zutaten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ingredients.map((ingredient) => (
                      <button
                        key={ingredient.id}
                        aria-label={`${ingredient.name} hinzufuegen (max ${ingredient.max_percentage}%)`}
                        onClick={() => handleAddIngredient(ingredient)}
                        className="p-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition-all text-left min-h-[44px]"
                      >
                        <div className="text-white font-medium text-sm mb-1">
                          {ingredient.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Max: {ingredient.max_percentage}%
                        </div>
                        <div className="text-xs text-cyan-400 mt-1">
                          {targetFish}: {ingredient.fish_attractiveness?.[targetFish] || 0}/10
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400">Deine Mischung</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono ${isValid ? 'text-green-400' : 'text-amber-400'}`}>
                        {totalPercentage}%
                      </span>
                      {!isValid && (
                        <span className="text-xs text-amber-400">(Ziel: 100%)</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeIngredients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Klicke auf Zutaten, um sie hinzuzufügen
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeIngredients.map(([name, value]) => {
                        const ingredient = ingredients.find(i => i.name === name);
                        return (
                          <div key={name} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{name}</div>
                              <div className="text-xs text-gray-400">Max: {ingredient?.max_percentage}%</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                               size="icon"
                               variant="outline"
                               aria-label={`${name} um 5% verringern`}
                               className="h-8 w-8 border-gray-700"
                               onClick={() => handleAddIngredient(ingredient, -5)}
                               disabled={value <= 0}
                              >
                               <Minus className="w-4 h-4" />
                              </Button>
                              <span className="text-white font-mono w-12 text-center" aria-live="polite" aria-label={`${name}: ${value} Prozent`}>{value}%</span>
                              <Button
                               size="icon"
                               variant="outline"
                               aria-label={`${name} um 5% erhoehen`}
                               className="h-8 w-8 border-gray-700"
                               onClick={() => handleAddIngredient(ingredient, 5)}
                               disabled={value >= ingredient?.max_percentage}
                              >
                               <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                               size="icon"
                               variant="ghost"
                               aria-label={`${name} entfernen`}
                               className="h-8 w-8 text-red-400 hover:text-red-300"
                               onClick={() => handleRemoveIngredient(name)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

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

              {activeIngredients.length > 0 && (
                <Card className="glass-morphism border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-cyan-400">Rezept speichern</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Rezeptname (z.B. Karpfen-Mix Sommer)"
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
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
                        onClick={resetMix}
                        variant="outline"
                        className="border-gray-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Zurücksetzen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              
              {activeIngredients.length > 0 && (
                <>
                  <Card className="glass-morphism border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 text-sm">Mischungsverhältnis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value}%`}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#f3f4f6'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-morphism border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Fisch-Attraktivität
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="fish" tick={{ fill: '#9CA3AF', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tick={{ fill: '#9CA3AF' }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#f3f4f6'
                            }}
                          />
                          <Bar dataKey="score" fill="#06B6D4" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="text-xs text-gray-400 text-center mt-2">
                        Zielfisch: <span className="text-cyan-400 font-semibold">{targetFish}</span> - 
                        Score: <span className="text-white font-semibold">{Math.round(fishScores[targetFish] * 10) / 10}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card className="glass-morphism border-gray-800">
                <CardHeader>
                  <CardTitle className="text-cyan-400 text-sm">Gespeicherte Rezepte</CardTitle>
                </CardHeader>
                <CardContent>
                  {recipes.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Noch keine Rezepte gespeichert
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-all cursor-pointer group"
                          onClick={() => loadRecipe(recipe)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-white text-sm font-medium truncate">
                                  {recipe.name}
                                </div>
                                {recipe.ai_generated && (
                                  <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" title="KI-optimiert" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {recipe.target_fish} · {recipe.category}
                              </div>
                              <div className="text-xs text-cyan-400 mt-1">
                                Score: {recipe.attractiveness_score}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecipeMutation.mutate(recipe.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PremiumGuard>
  );
}