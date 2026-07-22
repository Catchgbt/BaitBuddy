import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export default function RecipeBuilder({
  ingredients,
  mix,
  onAddIngredient,
  onRemoveIngredient,
  onUpdatePercentage,
  totalPercentage,
  targetFish
}) {
  const activeIngredients = Object.entries(mix).filter(([_, val]) => val > 0);
  const isValid = totalPercentage === 100;

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-cyan-400">Rezept-Editor</CardTitle>
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
      <CardContent className="space-y-6">
        {/* Verfügbare Zutaten */}
        <div>
          <h3 className="text-sm text-gray-400 mb-3 font-semibold">
            Zutaten verfügbar
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ingredients.map((ingredient) => {
              const currentValue = mix[ingredient.name] || 0;
              return (
                <button type="button"
                  key={ingredient.id}
                  onClick={() => onAddIngredient(ingredient)}
                  disabled={currentValue >= ingredient.max_percentage}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 disabled:bg-gray-800/20 disabled:opacity-50 border border-gray-700 rounded-lg transition-all text-left min-h-[44px] group"
                >
                  <div className="text-white font-medium text-xs mb-1 group-hover:text-cyan-400">
                    {ingredient.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Max: {ingredient.max_percentage}%
                  </div>
                  <div className="text-xs text-cyan-400 mt-1">
                    {targetFish}: {ingredient.fish_attractiveness?.[targetFish] || 0}/10
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aktive Zutaten mit Schiebern */}
        {activeIngredients.length > 0 && (
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm text-gray-400 mb-4 font-semibold">
              Deine Mischung ({activeIngredients.length} Zutaten)
            </h3>
            <div className="space-y-4">
              {activeIngredients.map(([name, value]) => {
                const ingredient = ingredients.find(i => i.name === name);
                const percentage = Math.round((value / totalPercentage) * 100) || value;

                return (
                  <div
                    key={name}
                    className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
                  >
                    {/* Name + Entfernen */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-white text-sm font-medium">{name}</div>
                        <div className="text-xs text-gray-500">
                          Max: {ingredient?.max_percentage}%
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => onRemoveIngredient(name)}
                        aria-label={`${name} entfernen`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Schieber */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={ingredient?.max_percentage || 100}
                        step="5"
                        value={value}
                        onChange={(e) =>
                          onUpdatePercentage(name, parseInt(e.target.value))
                        }
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        aria-label={`${name} Prozentage`}
                      />
                      <div className="text-right min-w-[45px]">
                        <div className="text-white font-mono font-semibold text-sm">
                          {value}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage}% der Mischung
                        </div>
                      </div>
                    </div>

                    {/* Inline Buttons für schnelle Anpassung */}
                    <div className="flex gap-1 mt-2">
                      <button type="button"
                        onClick={() =>
                          onUpdatePercentage(name, Math.max(0, value - 5))
                        }
                        className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                      >
                        −5%
                      </button>
                      <button type="button"
                        onClick={() =>
                          onUpdatePercentage(
                            name,
                            Math.min(ingredient?.max_percentage || 100, value + 5)
                          )
                        }
                        className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                      >
                        +5%
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leere Ansicht */}
        {activeIngredients.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-t border-gray-700">
            <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              Klicke auf Zutaten oben, um deine Mischung zu starten
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
