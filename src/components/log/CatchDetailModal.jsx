import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, MapPin, Calendar, Ruler, Weight, Fish, FileText, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CatchDetailModal({ catchItem, onClose, onEdit, spots }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  if (!catchItem) return null;

  const spot = spots?.find(s => s.id === catchItem.spot_id);

  const handleAnalyze = async () => {
    if (!catchItem.photo_url) {
      toast.error("Kein Foto vorhanden zum Analysieren!");
      return;
    }

    setIsAnalyzing(true);

    try {
      toast.info("🔍 KI analysiert das Foto...", { duration: 3000 });

      const response = await base44.functions.invoke('analyzeCatchPhoto', {
        file_url: catchItem.photo_url
      });

      const analysisData = response.data;

      if (analysisData && analysisData.result_data) {
        const { species_name, length_cm, weight_kg } = analysisData.result_data;

        // Aktualisiere den Fang mit den Analyse-Ergebnissen
        const updates = {};
        if (species_name && !catchItem.species) updates.species = species_name;
        if (length_cm && !catchItem.length_cm) updates.length_cm = length_cm;
        if (weight_kg && !catchItem.weight_kg) updates.weight_kg = weight_kg;

        if (Object.keys(updates).length > 0) {
          await base44.entities.Catch.update(catchItem.id, updates);
          
          toast.success("✨ Fang wurde mit KI-Daten aktualisiert!", {
            description: analysisData.summary || "Analyse abgeschlossen",
            duration: 5000
          });

          // Schließe Modal und aktualisiere Liste
          onClose();
          window.location.reload();
        } else {
          toast.info("Alle Daten sind bereits vorhanden", {
            description: analysisData.summary
          });
        }
      } else {
        toast.warning("KI konnte keine Daten extrahieren");
      }
    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
      toast.error("Fehler bei der KI-Analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="glass-morphism border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl text-cyan-400">
                {catchItem.species || "Fang"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              {catchItem.photo_url && (
                <div className="relative">
                  <img
                    src={catchItem.photo_url}
                    alt={catchItem.species}
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  {!catchItem.ai_analysis && (
                    <div className="mt-3">
                      <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analysiere Foto...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Foto mit KI analysieren
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {catchItem.length_cm && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Ruler className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-sm text-gray-400">Länge</div>
                      <div className="font-semibold">{catchItem.length_cm} cm</div>
                    </div>
                  </div>
                )}

                {catchItem.weight_kg && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Weight className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm text-gray-400">Gewicht</div>
                      <div className="font-semibold">{catchItem.weight_kg} kg</div>
                    </div>
                  </div>
                )}

                {catchItem.catch_time && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-sm text-gray-400">Datum</div>
                      <div className="font-semibold">
                        {format(new Date(catchItem.catch_time), 'PPP', { locale: de })}
                      </div>
                    </div>
                  </div>
                )}

                {spot && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-sm text-gray-400">Spot</div>
                      <div className="font-semibold">{spot.name}</div>
                    </div>
                  </div>
                )}

                {catchItem.bait_used && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Fish className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm text-gray-400">Köder</div>
                      <div className="font-semibold">{catchItem.bait_used}</div>
                    </div>
                  </div>
                )}

                {catchItem.is_released && (
                  <div className="col-span-2 flex items-center gap-2 text-emerald-400">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 flex items-center justify-center">
                      ✓
                    </div>
                    <span className="font-semibold">Fisch zurückgesetzt (C&R)</span>
                  </div>
                )}
              </div>

              {catchItem.notes && (
                <div className="flex items-start gap-2 text-gray-300">
                  <FileText className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Notizen</div>
                    <div className="whitespace-pre-wrap">{catchItem.notes}</div>
                  </div>
                </div>
              )}

              {catchItem.ai_analysis && (
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">KI-Analyse</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    {catchItem.ai_analysis.summary || "Foto wurde von der KI analysiert"}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Schließen
                </Button>
                <Button
                  onClick={() => {
                    onEdit(catchItem);
                    onClose();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Bearbeiten
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}