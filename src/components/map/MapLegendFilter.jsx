import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Navigation2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapLegendFilter({ 
  spotsCount, 
  publicLocationsCount,
  onFilterChange,
  onShowInfo
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    mySpots: true,
    publicLocations: true,
    favorites: false
  });

  const handleFilterToggle = (filterKey) => {
    const newFilters = {
      ...activeFilters,
      [filterKey]: !activeFilters[filterKey]
    };
    setActiveFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      mySpots: true,
      publicLocations: true,
      favorites: false
    };
    setActiveFilters(defaultFilters);
    if (onFilterChange) onFilterChange(defaultFilters);
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v).length;

  return (
    <div className="absolute top-4 left-4 z-[1000] max-w-xs">
      {/* Compact Button */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="glass-morphism gap-2 shadow-lg"
          size="sm"
        >
          <Filter className="w-4 h-4" />
          Legende & Filter
          {activeFilterCount < 3 && (
            <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Expanded Card */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="glass-morphism shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-cyan-400">
                    Legende & Filter
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Filter schliessen"
                    onClick={() => setIsExpanded(false)}
                    className="h-6 w-6"
                  >
                    <X aria-hidden="true" className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Legende */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-400 mb-2">
                    LEGENDE
                  </div>
                  
                  <button
                    onClick={() => handleFilterToggle('mySpots')}
                    aria-pressed={activeFilters.mySpots}
                    aria-label="Eigene Spots anzeigen"
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      activeFilters.mySpots 
                        ? 'bg-red-500/20 border border-red-500/50' 
                        : 'bg-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-white">Deine Spots</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {spotsCount}
                    </Badge>
                  </button>

                  <button
                    onClick={() => handleFilterToggle('publicLocations')}
                    aria-pressed={activeFilters.publicLocations}
                    aria-label="Oeffentliche Orte anzeigen"
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      activeFilters.publicLocations 
                        ? 'bg-green-500/20 border border-green-500/50' 
                        : 'bg-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-white">Öffentliche Orte</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {publicLocationsCount}
                    </Badge>
                  </button>

                  <button
                    onClick={() => handleFilterToggle('favorites')}
                    aria-pressed={activeFilters.favorites}
                    aria-label="Nur Favoriten anzeigen"
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      activeFilters.favorites 
                        ? 'bg-yellow-500/20 border border-yellow-500/50' 
                        : 'bg-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-white">Nur Favoriten</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <Navigation2 className="w-3 h-3 text-blue-400" />
                    <span className="text-sm text-white">Dein Standort</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full text-xs"
                  >
                    Alle Filter zurücksetzen
                  </Button>
                </div>

                {/* Info Button */}
                <div className="pt-2 border-t border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onShowInfo}
                    className="w-full text-xs gap-2"
                  >
                    <Info className="w-4 h-4" />
                    Karten-Funktionen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}