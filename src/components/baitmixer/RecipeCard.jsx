import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Zap } from "lucide-react";
import { DIFFICULTY_CONFIG, SEASON_CONFIG } from "@/data/baitRecipes.data";

export default function RecipeCard({
  recipe,
  prognosis,
  onLoad,
  onLoadingChange = () => {},
  isPredefined = true
}) {
  const difficulty = DIFFICULTY_CONFIG[recipe.difficulty] || DIFFICULTY_CONFIG.easy;
  const season = SEASON_CONFIG[recipe.season] || SEASON_CONFIG.allround;

  const handleClick = () => {
    onLoadingChange(true);
    setTimeout(() => {
      onLoad(recipe);
      onLoadingChange(false);
    }, 300);
  };

  const successRate = prognosis?.successRate || recipe.base_score || 75;
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-cyan-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Card
      onClick={handleClick}
      className="glass-morphism border-gray-800 hover:border-cyan-600/50 transition-all cursor-pointer group hover:shadow-xl hover:shadow-cyan-900/20"
    >
      <div className="p-4 space-y-3">
        {/* Header mit Icon und Name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate group-hover:text-cyan-400 transition-colors">
              {recipe.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {recipe.fish}
              {isPredefined ? (
                <span className="ml-2 inline-block">
                  ⭐ Vordefiniert
                </span>
              ) : (
                <span className="ml-2 inline-block">
                  📌 Eigenes Rezept
                </span>
              )}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Metadaten */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Jahreszeit */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-800/50 text-xs">
            <span>{season.emoji}</span>
            <span className="text-gray-300">{season.label}</span>
          </div>

          {/* Schwierigkeit */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${difficulty.bg} text-xs`}>
            <span>{difficulty.icon}</span>
            <span className={difficulty.color}>{difficulty.label}</span>
          </div>
        </div>

        {/* Beschreibung */}
        <p className="text-xs text-gray-400 line-clamp-2">
          {recipe.description}
        </p>

        {/* Success-Rate Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
          <div className="text-xs text-gray-500">
            {Object.keys(recipe.ingredients || {}).filter(k => (recipe.ingredients[k] > 0)).length} Zutaten
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className={`font-mono font-bold text-sm ${getScoreColor(successRate)}`}>
              {Math.round(successRate)}%
            </span>
          </div>
        </div>

        {/* Zutaten-Preview */}
        <div className="grid grid-cols-2 gap-1 text-xs pt-2 border-t border-gray-700/50">
          {Object.entries(recipe.ingredients || {})
            .filter(([_, v]) => v > 0)
            .slice(0, 4)
            .map(([ing, pct]) => (
              <div key={ing} className="text-gray-400">
                <span className="text-cyan-400">{pct}%</span> {ing}
              </div>
            ))}
        </div>

        {/* Load-Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs h-8"
        >
          Laden & Bearbeiten
        </Button>
      </div>
    </Card>
  );
}
