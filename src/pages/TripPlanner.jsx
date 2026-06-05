import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FishingPlan } from "@/entities/FishingPlan";
import { Eye, Trash2, Plus, Power, Navigation, Clock, ExternalLink, Save } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLocation } from "@/components/location/LocationManager";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

function TripPlannerContent() {
  useFeatureTracking("fishing_plan");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [travelInfo, setTravelInfo] = useState({});
  const [loadingTravel, setLoadingTravel] = useState({});
  const { currentLocation } = useLocation();
  const [offlineNotes, setOfflineNotes] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

  useEffect(() => {
    loadPlans();
    loadOfflineNotes();
  }, []);

  const loadOfflineNotes = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('trip_offline_notes') || '{}');
      setOfflineNotes(saved);
    } catch (error) {
      console.error("Fehler beim Laden der Notizen:", error);
    }
  };

  const saveOfflineNotes = (planId, notes) => {
    const updated = { ...offlineNotes, [planId]: notes };
    setOfflineNotes(updated);
    localStorage.setItem('trip_offline_notes', JSON.stringify(updated));
    toast.success("Notiz gespeichert");
  };

  useEffect(() => {
    if (selectedPlan && currentLocation?.lat && currentLocation?.lon) {
      loadTravelTime(selectedPlan);
    }
  }, [selectedPlan, currentLocation]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const fetchedPlans = await FishingPlan.list('-created_date');
      setPlans(fetchedPlans);
    } catch (error) {
      console.error("Fehler beim Laden der Plaene:", error);
    }
    setLoading(false);
  };

  const loadTravelTime = async (plan) => {
    if (!currentLocation?.lat || !currentLocation?.lon) {
      return;
    }

    const coordMatch = plan.spot_info?.match(/Koordinaten:\s*([\d.]+),\s*([\d.]+)/);
    if (!coordMatch) {
      return;
    }

    const toLat = parseFloat(coordMatch[1]);
    const toLon = parseFloat(coordMatch[2]);

    setLoadingTravel(prev => ({ ...prev, [plan.id]: true }));

    try {
      const response = await base44.functions.invoke('calculateTravelTime', {
        fromLat: currentLocation.lat,
        fromLon: currentLocation.lon,
        toLat: toLat,
        toLon: toLon
      });

      if (response.data?.duration_minutes) {
        setTravelInfo(prev => ({
          ...prev,
          [plan.id]: {
            duration_minutes: response.data.duration_minutes,
            distance_km: response.data.distance_km,
            fromLat: currentLocation.lat,
            fromLon: currentLocation.lon,
            toLat,
            toLon
          }
        }));
      }
    } catch (error) {
      console.error("Fehler beim Laden der Fahrzeit:", error);
    } finally {
      setLoadingTravel(prev => ({ ...prev, [plan.id]: false }));
    }
  };

  const openGoogleMaps = (info) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${info.fromLat},${info.fromLon}&destination=${info.toLat},${info.toLon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const toggleActivePlan = async (plan) => {
    try {
      const newActiveState = !plan.is_active;
      await FishingPlan.update(plan.id, { is_active: newActiveState });
      
      setPlans(plans.map(p => 
        p.id === plan.id ? { ...p, is_active: newActiveState } : p
      ));
      
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan({ ...selectedPlan, is_active: newActiveState });
      }
      
      window.dispatchEvent(new Event('active-trips-updated'));
      
      if (newActiveState) {
        base44.analytics.track({
          eventName: "fishing_trip_started",
          properties: {
            target_fish: plan.target_fish,
            has_travel_info: !!travelInfo[plan.id],
            plan_age_days: Math.floor((Date.now() - new Date(plan.created_date).getTime()) / (1000 * 60 * 60 * 24))
          }
        });
      }
      
      toast.success(newActiveState ? 'Trip aktiviert' : 'Trip deaktiviert');
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Trip-Status:", error);
      toast.error("Fehler beim Aktualisieren des Trip-Status");
    }
  };

  const deletePlan = async (planId) => {
    if (!confirm("Plan wirklich loeschen?")) return;
    
    try {
      await FishingPlan.delete(planId);
      await loadPlans();
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
      
      window.dispatchEvent(new Event('active-trips-updated'));
      
      toast.success("Plan geloescht");
    } catch (error) {
      console.error("Fehler beim Loeschen des Plans:", error);
      toast.error("Fehler beim Loeschen des Plans");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">Mein Trip planen</h1>
          <Link to={createPageUrl("Gear")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Neuen Plan erstellen
            </Button>
          </Link>
        </div>

        {plans.length === 0 ? (
          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] mb-2">Noch keine Plaene erstellt</h3>
              <p className="text-gray-400 mb-6">
                Erstelle deinen ersten Angelplan mit der KI-Ausruestungsanalyse
              </p>
              <Link to={createPageUrl("Gear")}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Plan erstellen
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {plans.map((plan) => {
                const travel = travelInfo[plan.id];
                const isLoadingThisTravel = loadingTravel[plan.id];
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`glass-morphism border-gray-800 cursor-pointer transition-all hover:border-emerald-600/50 ${
                      selectedPlan?.id === plan.id ? 'border-emerald-600 bg-emerald-900/20' : ''
                    } ${plan.is_active ? 'border-l-4 border-l-emerald-500' : ''}`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] text-lg">{plan.title}</CardTitle>
                            {plan.is_active && (
                              <Badge className="bg-emerald-600 text-white text-xs">
                                Aktiv
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={plan.is_active ? "Trip deaktivieren" : "Trip aktivieren"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActivePlan(plan);
                            }}
                            className={plan.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-gray-400 hover:text-white"}
                          >
                            <Power aria-hidden="true" className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Plan-Details anzeigen"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlan(plan);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Plan loeschen"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlan(plan.id);
                            }}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 aria-hidden="true" className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Zielfisch:</span> {plan.target_fish}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Spot:</span> {plan.spot_info}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Erstellt:</span> {formatDate(plan.created_date)}
                        </div>
                        
                        {isLoadingThisTravel && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>Berechne Route...</span>
                          </div>
                        )}
                        
                        {travel && !isLoadingThisTravel && (
                          <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span className="text-gray-300">
                                {travel.duration_minutes} Min ({travel.distance_km} km)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoogleMaps(travel);
                              }}
                              className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Route in Google Maps oeffnen
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="lg:sticky lg:top-6">
              {selectedPlan ? (
                <Card className="glass-morphism border-gray-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">{selectedPlan.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className="bg-emerald-600">{selectedPlan.target_fish}</Badge>
                          <Badge variant="outline">{formatDate(selectedPlan.created_date)}</Badge>
                          {selectedPlan.is_active && (
                            <Badge className="bg-emerald-600 animate-pulse">
                              Aktiver Trip
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] mb-2">Spot-Informationen</h4>
                      <p className="text-gray-300 text-sm">{selectedPlan.spot_info}</p>
                    </div>

                    {travelInfo[selectedPlan.id] && (
                      <div>
                        <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] mb-2">Anfahrt</h4>
                        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Fahrzeit:</span>
                            <span className="text-white font-medium">{travelInfo[selectedPlan.id].duration_minutes} Minuten</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Entfernung:</span>
                            <span className="text-white font-medium">{travelInfo[selectedPlan.id].distance_km} km</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGoogleMaps(travelInfo[selectedPlan.id])}
                            className="w-full mt-2"
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            Navigation starten
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] mb-2">Wetterbedingungen</h4>
                      <p className="text-gray-300 text-sm">{selectedPlan.weather_summary}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] mb-2">Ausruestung</h4>
                      <p className="text-gray-300 text-sm">{selectedPlan.gear_summary}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)] mb-2">KI-Empfehlungen</h4>
                      <ul className="space-y-1">
                        {selectedPlan.steps?.map((step, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-emerald-400 mt-1">-</span>
                            <span>{step}</span>
                          </li>
                        )) || []}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">Meine Notizen (Offline)</h4>
                        <Badge className="text-xs bg-emerald-600/20 border-emerald-600 text-emerald-300">
                          Lokal gespeichert
                        </Badge>
                      </div>
                      {editingNotes[selectedPlan.id] ? (
                        <div className="space-y-2">
                          <Textarea
                            value={offlineNotes[selectedPlan.id] || ''}
                            onChange={(e) => {
                              const newNotes = e.target.value;
                              setOfflineNotes(prev => ({
                                ...prev,
                                [selectedPlan.id]: newNotes
                              }));
                            }}
                            placeholder="Schreibe deine Notizen und Beobachtungen..."
                            className="bg-gray-800/50 border-gray-700 text-white min-h-[120px]"
                          />
                          <Button
                            onClick={() => {
                              saveOfflineNotes(selectedPlan.id, offlineNotes[selectedPlan.id] || '');
                              setEditingNotes(prev => ({
                                ...prev,
                                [selectedPlan.id]: false
                              }));
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            size="sm"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="bg-gray-800/50 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto mb-2">
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">
                              {offlineNotes[selectedPlan.id] || 'Noch keine Notizen. Klicke auf Bearbeiten um zu schreiben.'}
                            </p>
                          </div>
                          <Button
                            onClick={() => setEditingNotes(prev => ({
                              ...prev,
                              [selectedPlan.id]: true
                            }))}
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            Bearbeiten
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => toggleActivePlan(selectedPlan)}
                        className={selectedPlan.is_active ? "bg-emerald-600/20 border-emerald-600" : ""}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {selectedPlan.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      </Button>
                      <Link to={createPageUrl("Gear")} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Bearbeiten
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        onClick={() => deletePlan(selectedPlan.id)}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Loeschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-morphism border-gray-800">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">
                      Waehle einen Plan aus der Liste, um die Details zu sehen
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripPlanner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        console.log("User not logged in:", e);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400">Laden...</div>
      </div>
    );
  }

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="basic"
      feature="Der Trip-Planer"
    >
      <TripPlannerContent />
    </PremiumGuard>
  );
}