import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import RecipeCard from "./RecipeCard";
import { RECIPE_LIST } from "@/data/baitRecipes.data";
import { calculatePredefinedRecipeSuccessRate } from "@/utils/baitPrognosis.utils";
import { Loader2 } from "lucide-react";

export default function QuickStartGrid({
  ingredients,
  onLoadRecipe,
  waterTemp = 15,
  season = "allround",
  waterType = "lake"
}) {
  const [selectedFish, setSelectedFish] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("allround");
  const [sortBy, setSortBy] = useState("success");
  const [loadingId, setLoadingId] = useState(null);

  const fishOptions = [...new Set(RECIPE_LIST.map(r => r.fish))].map(fish => ({
    value: fish,
    label: fish
  }));

  // Filtere Rezepte
  const filteredRecipes = useMemo(() => {
    let recipes = RECIPE_LIST;

    if (selectedFish) {
      recipes = recipes.filter(r => r.fish === selectedFish);
    }

    if (selectedSeason !== "all") {
      recipes = recipes.filter(
        r => r.season === selectedSeason || r.season === "allround"
      );
    }

    return recipes;
  }, [selectedFish, selectedSeason]);

  // Berechne Prognosen und sortiere
  const sortedRecipes = useMemo(() => {
    const withPrognosis = filteredRecipes.map(recipe => ({
      ...recipe,
      prognosis: calculatePredefinedRecipeSuccessRate(
        recipe,
        ingredients,
        waterTemp,
        season,
        waterType
      )
    }));

    switch (sortBy) {
      case "success":
        return withPrognosis.sort(
          (a, b) => b.prognosis.successRate - a.prognosis.successRate
        );
      case "name":
        return withPrognosis.sort((a, b) => a.name.localeCompare(b.name));
      case "difficulty":
        const diffOrder = { easy: 1, medium: 2, hard: 3 };
        return withPrognosis.sort(
          (a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]
        );
      default:
        return withPrognosis;
    }
  }, [filteredRecipes, ingredients, waterTemp, season, waterType, sortBy]);

  const handleLoadRecipe = (recipe) => {
    setLoadingId(recipe.id);
    setTimeout(() => {
      onLoadRecipe(recipe);
      setLoadingId(null);
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Header mit Filterung */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400">Vordefinierte Rezepte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Wähle einen Fisch und eine Jahreszeit, um optimale Rezepte zu sehen.
            Die KI berechnet automatisch die beste Success-Rate für deine Bedingungen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fisch-Filter */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Zielfisch (optional)
              </label>
              <MobileSelect
                value={selectedFish}
                onValueChange={setSelectedFish}
                options={[
                  { value: "", label: "Alle Fische" },
                  ...fishOptions
                ]}
                placeholder="Alle Fische"
              />
            </div>

            {/* Jahreszeit-Filter */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Jahreszeit (optional)
              </label>
              <MobileSelect
                value={selectedSeason}
                onValueChange={setSelectedSeason}
                options={[
                  { value: "all", label: "Alle Jahreszeiten" },
                  { value: "summer", label: "Sommer" },
                  { value: "winter", label: "Winter" },
                  { value: "allround", label: "Ganzjahres" }
                ]}
              />
            </div>

            {/* Sortierung */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Sortieren nach
              </label>
              <MobileSelect
                value={sortBy}
                onValueChange={setSortBy}
                options={[
                  { value: "success", label: "Best Success-Rate" },
                  { value: "difficulty", label: "Schwierigkeit" },
                  { value: "name", label: "A–Z Alphabetisch" }
                ]}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {sortedRecipes.length} Rezept{sortedRecipes.length !== 1 ? "e" : ""} gefunden
          </div>
        </CardContent>
      </Card>

      {/* Rezept-Grid */}
      {sortedRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRecipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              {loadingId === recipe.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10 backdrop-blur-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                </div>
              )}
              <RecipeCard
                recipe={recipe}
                prognosis={recipe.prognosis}
                onLoad={handleLoadRecipe}
                onLoadingChange={(loading) => {
                  if (loading) setLoadingId(recipe.id);
                }}
                isPredefined={true}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="glass-morphism border-gray-800">
          <CardContent className="py-12 text-center text-gray-400">
            <div className="text-lg mb-2">Keine Rezepte gefunden</div>
            <div className="text-sm">
              Versuche eine andere Filter-Kombination.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info-Box */}
      <Card className="glass-morphism border-cyan-600/30 bg-cyan-900/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-sm text-gray-300">
              <strong>Tipp:</strong> Die vordefinierte Rezepte sind bewährte Mischungen, die du sofort verwenden kannst.
              Klicke auf "Laden & Bearbeiten", um das Rezept zu verfeinern.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
