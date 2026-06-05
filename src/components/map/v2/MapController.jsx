import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Spot } from "@/entities/Spot";
import { FishingClub } from "@/entities/FishingClub";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Layers, Navigation, X, Loader2, Info } from "lucide-react";
import { useLocation } from "@/components/location/LocationManager";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";
import MapView from "./MapView";
import AddSpotModal from "./AddSpotModal";
import LocationDetailPanel from "./LocationDetailPanel";


function MapController() {
  const { currentLocation, requestGpsLocation, setSpotAsLocation } = useLocation();
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const queryClient = useQueryClient();

  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpotCoords, setNewSpotCoords] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filters, setFilters] = useState({
    spots: true,
    clubs: true,
    parks: true,
    waters: true
  });
  const [waterBodies, setWaterBodies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Query data with react-query
  const { data: spots = [] } = useQuery({
    queryKey: ['mapSpots'],
    queryFn: () => Spot.list().catch(() => []),
    initialData: []
  });

  const { data: fishingClubs = [] } = useQuery({
    queryKey: ['mapClubs'],
    queryFn: () => FishingClub.list(),
    initialData: []
  });

  useEffect(() => {
    initializeMap();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (currentLocation && currentLocation.lat != null && currentLocation.lon != null && !isInitialized) {
      console.log("Setting map center from currentLocation:", currentLocation);
      setMapCenter({ lat: currentLocation.lat, lng: currentLocation.lon });
      setIsInitialized(true);
    }
  }, [currentLocation, isInitialized]);

  const initializeMap = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lon = urlParams.get('lon');
    
    if (lat && lon) {
      console.log("Setting map center from URL params:", { lat, lon });
      setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
      setMapZoom(15);
      setIsInitialized(true);
    } else if (currentLocation && currentLocation.lat != null && currentLocation.lon != null) {
      console.log("Setting map center from currentLocation:", currentLocation);
      setMapCenter({ lat: currentLocation.lat, lng: currentLocation.lon });
      setIsInitialized(true);
    } else {
      console.log("Setting default map center (Germany)");
      setMapCenter({ lat: 51.1657, lng: 10.4515 });
      setMapZoom(6);
      setIsInitialized(true);
    }
  };



  const handleMapClick = useCallback((coords) => {
    if (!showAddModal && !selectedLocation) {
      setNewSpotCoords(coords);
      triggerHaptic('light');
    }
  }, [showAddModal, selectedLocation, triggerHaptic]);

  const handleAddSpotClick = useCallback(() => {
    if (!newSpotCoords) {
      toast.warning("Bitte setze zuerst einen Pin auf der Karte");
      return;
    }
    setShowAddModal(true);
    triggerHaptic('medium');
    playSound('click');
  }, [newSpotCoords, triggerHaptic, playSound]);

  const addSpotMutation = useOptimisticMutation({
    queryKey: 'mapSpots',
    mutationFn: (spotData) => Spot.create(spotData),
    optimisticUpdate: (oldSpots = [], newSpot) => [
      { id: `tmp-${Date.now()}`, ...newSpot },
      ...oldSpots
    ],
    onSuccess: () => {
      triggerHaptic('success');
      playSound('success');
      toast.success("Spot erfolgreich hinzugefügt!");
    },
    onError: (error) => {
      console.error('Add spot error:', error);
      toast.error("Fehler beim Hinzufügen des Spots");
    },
    invalidateOnSettle: true
  });

  const updateSpotMutation = useOptimisticMutation({
    queryKey: 'mapSpots',
    mutationFn: ({ id, data }) => Spot.update(id, data),
    optimisticUpdate: (oldSpots = [], variables) => 
      oldSpots.map(spot => 
        spot.id === variables.id ? { ...spot, ...variables.data } : spot
      ),
    onSuccess: () => {
      triggerHaptic('success');
      playSound('success');
      toast.success("Spot erfolgreich aktualisiert!");
    },
    onError: (error) => {
      console.error('Update spot error:', error);
      toast.error("Fehler beim Aktualisieren des Spots");
    },
    invalidateOnSettle: true
  });

  const deleteSpotMutation = useOptimisticMutation({
    queryKey: 'mapSpots',
    mutationFn: (id) => Spot.delete(id),
    optimisticUpdate: (oldSpots = [], id) => 
      oldSpots.filter(spot => spot.id !== id),
    onSuccess: () => {
      triggerHaptic('success');
      playSound('success');
      toast.success("Spot erfolgreich gelöscht!");
      setSelectedLocation(null);
    },
    onError: (error) => {
      console.error('Delete spot error:', error);
      toast.error("Fehler beim Löschen des Spots");
    },
    invalidateOnSettle: true
  });

  const handleSpotAdded = useCallback(() => {
    setNewSpotCoords(null);
    setShowAddModal(false);
    // Invalidate fishingClubs as well since spots might relate to clubs
    queryClient.invalidateQueries({ queryKey: ['mapClubs'] });
  }, [queryClient]);

  // Screenreader-Statusmeldung für dynamische Kartenänderungen
  const [liveRegionMessage, setLiveRegionMessage] = useState('');

  const announceLive = useCallback((msg) => {
    setLiveRegionMessage('');
    setTimeout(() => setLiveRegionMessage(msg), 50);
  }, []);

  const handleLocationClick = useCallback((location, type) => {
    setSelectedLocation({ ...location, type });
    triggerHaptic('light');
    playSound('selection');
  }, [triggerHaptic, playSound]);

  const handleMyLocation = useCallback(async () => {
    triggerHaptic('medium');
    announceLive('Standort wird ermittelt...');
    await requestGpsLocation();
    if (currentLocation && currentLocation.lat != null && currentLocation.lon != null) {
      setMapCenter({ lat: currentLocation.lat, lng: currentLocation.lon });
      setMapZoom(15);
      toast.success("Standort aktualisiert");
      announceLive('Standort aktualisiert');
    }
  }, [triggerHaptic, requestGpsLocation, currentLocation, announceLive]);

  const filteredSpots = filters.spots ? spots : [];
  const filteredClubs = fishingClubs.filter(fc => {
    if (fc.category === 'club') return filters.clubs;
    if (fc.category === 'spot') return filters.parks;
    return false;
  });
  const filteredWaters = filters.waters ? waterBodies : [];

  if (!isInitialized || !mapCenter) {
    return (
      <div 
        className="relative h-[calc(100vh-250px)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Karte wird geladen"
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Karte wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Screenreader-Live-Region fuer Kartenstatusaenderungen */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveRegionMessage}
      </div>
      
      {/* Button-Leiste */}
      <div className="flex-shrink-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800 p-2">
        <div className="flex justify-between items-center gap-2">
          
          {/* Linke Button-Gruppe */}
          <div className="flex gap-1.5">
            <Button
              onClick={() => setShowInfo(!showInfo)}
              aria-label={showInfo ? "Karteninfo ausblenden" : "Karteninfo anzeigen"}
              aria-expanded={showInfo}
              className="bg-gray-800/90 hover:bg-gray-700 border border-gray-700 min-h-[44px] px-3"
            >
              <Info aria-hidden="true" className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
              <span className="hidden sm:inline text-xs">Info</span>
            </Button>
            
            <Button
              onClick={handleMyLocation}
              aria-label="Zu meinem aktuellen Standort navigieren"
              className="bg-gray-800/90 hover:bg-gray-700 border border-gray-700 min-h-[44px] px-3"
            >
              <Navigation aria-hidden="true" className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
              <span className="hidden sm:inline text-xs">Standort</span>
            </Button>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              aria-label={showFilters ? "Kartenfilter ausblenden" : "Kartenfilter anzeigen"}
              aria-expanded={showFilters}
              className="bg-gray-800/90 hover:bg-gray-700 border border-gray-700 min-h-[44px] px-3"
            >
              <Layers aria-hidden="true" className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
              <span className="hidden sm:inline text-xs">Filter</span>
            </Button>
          </div>

          {/* Rechte Buttons */}
           <div className="flex gap-1.5">
{newSpotCoords && !showAddModal && (
                  <Button
                    onClick={handleAddSpotClick}
                    disabled={addSpotMutation.isPending}
                    aria-label="Neuen Spot bei ausgewaehltem Ort hinzufuegen"
                    className="bg-emerald-600/90 hover:bg-emerald-700 border border-emerald-500/50 text-white min-h-[44px] px-3"
                  >
                    <Plus aria-hidden="true" className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline text-xs">Spot</span>
                  </Button>
                )}
           </div>
          </div>

        {/* Filter Panel */}
        {showFilters && (
         <div className="mt-2 bg-gray-800/50 rounded-lg p-2 space-y-1.5" role="group" aria-label="Kartenebenen-Filter">
           <div aria-live="polite" aria-atomic="true" aria-label="Aktive Kartenebenen und Orte Summary">
             <div className="sr-only">
               Filter aktiv: {filters.spots && 'Spots'}{filters.spots && filters.clubs && ', '}{filters.clubs && 'Vereine'}{(filters.spots || filters.clubs) && filters.waters && ', '}{filters.waters && 'Gewaesser'}. 
               Karte zeigt {filteredSpots.length} Spots, {filteredClubs.length} Vereine, {filteredWaters.length} Gewaesser. 
               Insgesamt {filteredSpots.length + filteredClubs.length + filteredWaters.length} Orte sichtbar.
             </div>
             <div className="text-xs text-gray-400 px-2 py-1 bg-gray-900/50 rounded mb-2" role="status">
               {filteredSpots.length + filteredClubs.length + filteredWaters.length} Orte sichtbar
             </div>
           </div>
           <div className="flex items-center gap-2">
             <input
               type="checkbox"
               id="filter-spots"
               checked={filters.spots}
               onChange={(e) => setFilters({ ...filters, spots: e.target.checked })}
               className="w-4 h-4 min-h-[44px] min-w-[44px] cursor-pointer"
               aria-label="Meine persoenlichen Angelspots anzeigen"
             />
             <label htmlFor="filter-spots" className="text-xs text-white cursor-pointer">Meine Spots</label>
           </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="filter-clubs"
                checked={filters.clubs}
                onChange={(e) => setFilters({ ...filters, clubs: e.target.checked })}
                className="w-4 h-4 min-h-[44px] min-w-[44px] cursor-pointer"
                aria-label="Angelvereine und Verbands-Plaetze anzeigen"
              />
              <label htmlFor="filter-clubs" className="text-xs text-white cursor-pointer">Angelvereine</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="filter-parks"
                checked={filters.parks}
                onChange={(e) => setFilters({ ...filters, parks: e.target.checked })}
                className="w-4 h-4 min-h-[44px] min-w-[44px] cursor-pointer"
                aria-label="Kommerzielle Angelparks anzeigen"
              />
              <label htmlFor="filter-parks" className="text-xs text-white cursor-pointer">Angelparks</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="filter-waters"
                checked={filters.waters}
                onChange={(e) => setFilters({ ...filters, waters: e.target.checked })}
                className="w-4 h-4 min-h-[44px] min-w-[44px] cursor-pointer"
                aria-label="Gewaesser aus OpenStreetMap-Daten anzeigen"
              />
              <label htmlFor="filter-waters" className="text-xs text-white cursor-pointer">Gewässer (OSM)</label>
            </div>
          </div>
        )}
      </div>

      {/* Karten-Container */}
      <div className="relative flex-1 min-h-0">
        
        {/* Info-Banner */}
         {showInfo && (
           <div 
             className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-gray-950/95 via-gray-950/90 to-transparent backdrop-blur-md z-[1001] border-b border-cyan-500/20" 
             role="region" 
             aria-live="polite" 
             aria-atomic="true"
             aria-label="Karteninfos und Anleitung"
           >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                    Deine Angelkarte
                  </h2>
                </div>
                <p className="text-xs text-gray-300 mb-2">
                  Entdecke, plane und navigiere zu deinen Angelspots:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span><strong className="text-blue-300">Blaue Marker:</strong> Deine persönlichen Spots</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <span><strong className="text-green-300">Grüne Marker:</strong> Angelvereine & Parks</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <span><strong className="text-red-300">Roter Marker:</strong> Dein aktueller Standort</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <span><strong className="text-orange-300">Orange Marker:</strong> Neuer Spot (zum Speichern)</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">
                    💡 <strong>Tipp:</strong> Klicke auf die Karte um einen neuen Spot zu markieren, oder auf einen Marker für Details & Navigation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                aria-label="Infobanner schliessen"
                className="text-gray-400 hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded active:scale-95"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Map View */}
         <MapView
           center={mapCenter}
           zoom={mapZoom}
           spots={filteredSpots}
           fishingClubs={filteredClubs}
           waterBodies={filteredWaters}
           currentLocation={currentLocation}
           newSpotMarker={newSpotCoords}
           onMapClick={handleMapClick}
           onLocationClick={handleLocationClick}
           onSpotClick={(spot) => handleLocationClick(spot, 'spot')}
           onClubClick={(club) => handleLocationClick(club, 'club')}
           onWaterBodiesLoad={setWaterBodies}
           onReviewsLoad={setReviews}
           isOnline={isOnline}
         />

        {/* Location Detail Panel */}
        {selectedLocation && (
          <LocationDetailPanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onSetAsLocation={() => {
              if (selectedLocation.type === 'spot') {
                setSpotAsLocation(selectedLocation);
              }
              setSelectedLocation(null);
            }}
          />
        )}

        {/* Add Spot Modal */}
         {showAddModal && (
           <AddSpotModal
             isOpen={showAddModal}
             coordinates={newSpotCoords}
             onClose={() => {
               setShowAddModal(false);
               setNewSpotCoords(null);
             }}
             onSpotAdded={handleSpotAdded}
           />
         )}


        </div>
        </div>
        );
        }

export default memo(MapController);