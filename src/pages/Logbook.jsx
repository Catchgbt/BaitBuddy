import React, { useState, useCallback, useRef, useEffect } from "react";
import { analytics } from "@/api/frontendClient";
import { entities } from "@/api/frontendClient";
import { Catch } from "@/entities/Catch";
import { Spot } from "@/entities/Spot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/optimistic/useOptimisticMutation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Textarea } from "@/components/ui/textarea";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import { toast } from "sonner";
import { Upload, X, Loader2, Share2, BarChart2, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import CatchHistory from "@/components/log/CatchHistory";
import LazyImage from "@/components/images/LazyImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function Logbook() {
  useFeatureTracking("catch_log");
  const queryClient = useQueryClient();

  // Data fetching
  const { data: catches = [], isLoading: catchesLoading } = useQuery({
    queryKey: ['catches'],
    queryFn: () => Catch.list('-catch_time'),
  });

  const { data: spots = [], isLoading: spotsLoading } = useQuery({
    queryKey: ['spots'],
    queryFn: () => Spot.list(),
  });

  const loading = catchesLoading || spotsLoading;

  // Form state
  const [photoUrl, setPhotoUrl] = useState("");
  const [aiAnalyzingPhoto, setAiAnalyzingPhoto] = useState(false);
  const [species, setSpecies] = useState("");
  const [spotId, setSpotId] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [baitUsed, setBaitUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [catchTime, setCatchTime] = useState(new Date().toISOString().slice(0, 16));
  const [editingCatch, setEditingCatch] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedCatchData, setSavedCatchData] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareInCommunity, setShareInCommunity] = useState(false);
  const shareRef = useRef(shareInCommunity);

  useEffect(() => { shareRef.current = shareInCommunity; }, [shareInCommunity]);

  // Reload on external events
  useEffect(() => {
    const handleCatchSaved = () => queryClient.invalidateQueries({ queryKey: ['catches'] });
    window.addEventListener('catch-saved', handleCatchSaved);
    return () => window.removeEventListener('catch-saved', handleCatchSaved);
  }, [queryClient]);

  // Reset form
  const resetForm = useCallback(() => {
    setPhotoUrl("");
    setSpecies("");
    setSpotId("");
    setLengthCm("");
    setWeightKg("");
    setBaitUsed("");
    setNotes("");
    setCatchTime(new Date().toISOString().slice(0, 16));
    setEditingCatch(null);
    setShareInCommunity(false);
  }, []);

  // Mutations
  const createCatchMutation = useOptimisticMutation(catches, {
    mutationFn: async (catchData) => {
      const created = await Catch.create(catchData);
      return [created, ...catches.filter(c => !c.id.startsWith('tmp-'))];
    },
    optimisticData: (variables) => {
      const tmpId = `tmp-${Date.now()}`;
      return [{ id: tmpId, ...variables, created_date: new Date().toISOString() }, ...catches];
    },
    onSuccess: async (newCatches, variables) => {
      toast.success("Fang gespeichert!");
      resetForm();
      const savedCatch = newCatches[0];
      setSavedCatchData(savedCatch);

      analytics.track({
        eventName: "fishing_catch_logged",
        properties: {
          species: variables.species,
          has_photo: !!variables.photo_url,
          has_spot: !!variables.spot_id,
          length_cm: variables.length_cm ?? null,
        },
      });

      if (shareRef.current) {
        const catchText = `🎣 Mein Fang: ${savedCatch.species}${savedCatch.length_cm ? ` (${savedCatch.length_cm}cm)` : ''}${savedCatch.weight_kg ? `, ${savedCatch.weight_kg}kg` : ''}`;
        await entities.Post.create({ text: catchText, photo_url: savedCatch.photo_url || null, likes: 0, reported: false });
        toast.success("Mit Community geteilt!");
        setShareInCommunity(false);
      } else {
        setShowShareDialog(true);
      }
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const updateCatchMutation = useOptimisticMutation(catches, {
    mutationFn: async ({ id, data }) => {
      await Catch.update(id, data);
      return catches.map(c => c.id === id ? { ...c, ...data } : c);
    },
    optimisticData: ({ id, data }) =>
      catches.map(c => c.id === id ? { ...c, ...data } : c),
    onSuccess: () => { toast.success("Fang aktualisiert!"); resetForm(); },
    onError: () => toast.error("Fehler beim Update"),
  });

  const deleteCatchMutation = useOptimisticMutation(catches, {
    mutationFn: async (id) => {
      await Catch.delete(id);
      return catches.filter(c => c.id !== id);
    },
    optimisticData: (id) => catches.filter(c => c.id !== id),
    onSuccess: () => toast.success("Fang gelöscht"),
    onError: () => toast.error("Fehler beim Löschen"),
  });

  // KI Photo Analysis - MAIN FEATURE
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Nur Bilder erlaubt");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 10MB)");
      return;
    }

    setUploading(true);
    try {
      // Upload image
      const { file_url } = await UploadFile({ file });
      setPhotoUrl(file_url);
      toast.info("Foto hochgeladen! KI analysiert...");

      // AUTO-ANALYZE WITH KI
      setAiAnalyzingPhoto(true);
      try {
        const extractionSchema = {
          type: "object",
          properties: {
            species: { type: "string", description: "Fischart (z.B. Hecht, Zander, Forelle)" },
            length_cm: { type: "number", description: "Länge in cm" },
            weight_kg: { type: "number", description: "Gewicht in kg" },
            bait_used: { type: "string", description: "Verwendeter Köder" },
            notes: { type: "string", description: "Zusätzliche Beobachtungen" }
          },
          required: ["species"]
        };

        const { output } = await ExtractDataFromUploadedFile({
          file_url,
          json_schema: extractionSchema
        });

        if (output?.species) {
          setSpecies(output.species);
          toast.success("KI hat die Fischart erkannt: " + output.species);
        }
        if (output?.length_cm) setLengthCm(String(output.length_cm));
        if (output?.weight_kg) setWeightKg(String(output.weight_kg));
        if (output?.bait_used) setBaitUsed(output.bait_used);
        if (output?.notes) setNotes(output.notes);

        if (output?.species) {
          toast.success("✨ KI hat Stats gefüllt!");
        }
      } catch (aiErr) {
        console.warn("AI analysis failed, but photo is uploaded:", aiErr);
        toast.info("Foto hochgeladen. Bitte Stats manuell nachtragen.");
      } finally {
        setAiAnalyzingPhoto(false);
      }
    } catch (err) {
      toast.error("Upload fehlgeschlagen");
      setPhotoUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!species?.trim()) {
      toast.error("Fischart erforderlich");
      return;
    }

    const catchData = {
      species: species.trim(),
      spot_id: spotId || null,
      length_cm: lengthCm ? parseFloat(lengthCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      bait_used: baitUsed.trim() || null,
      photo_url: photoUrl || null,
      notes: notes.trim() || null,
      catch_time: new Date(catchTime).toISOString(),
      points_earned: 1,
    };

    if (editingCatch) {
      await updateCatchMutation.mutate({ id: editingCatch.id, data: catchData });
    } else {
      await createCatchMutation.mutate(catchData);
    }
  };

  const handleEdit = useCallback((catchItem) => {
    setEditingCatch(catchItem);
    setPhotoUrl(catchItem.photo_url || "");
    setSpecies(catchItem.species || "");
    setSpotId(catchItem.spot_id || "");
    setLengthCm(catchItem.length_cm?.toString() || "");
    setWeightKg(catchItem.weight_kg?.toString() || "");
    setBaitUsed(catchItem.bait_used || "");
    setNotes(catchItem.notes || "");
    setCatchTime(new Date(catchItem.catch_time).toISOString().slice(0, 16));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDelete = useCallback((id) => {
    if (confirm("Fang wirklich löschen?")) {
      deleteCatchMutation.mutate(id);
    }
  }, [deleteCatchMutation]);

  const handleShareToCommunity = async () => {
    if (!savedCatchData) return;
    setIsSharing(true);
    try {
      const catchText = `🎣 Mein Fang: ${savedCatchData.species}${savedCatchData.length_cm ? ` (${savedCatchData.length_cm}cm)` : ''}${savedCatchData.weight_kg ? `, ${savedCatchData.weight_kg}kg` : ''}`;
      await entities.Post.create({ text: catchText, photo_url: savedCatchData.photo_url || null, likes: 0, reported: false });
      toast.success("Mit Community geteilt!");
      setShowShareDialog(false);
      setSavedCatchData(null);
    } catch {
      toast.error("Fehler beim Teilen");
    } finally {
      setIsSharing(false);
    }
  };

  const isSaving = createCatchMutation.isPending || updateCatchMutation.isPending;

  if (loading && catches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <SwipeToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['catches'] })}>
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        {/* MAIN FORM */}
        <Card className="glass-morphism border-cyan-500/30 bg-gradient-to-br from-gray-900 to-gray-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                {editingCatch ? "Fang bearbeiten" : "Neuen Fang erfassen"}
              </CardTitle>
              <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold animate-pulse">
                BETA
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PHOTO UPLOAD - MAIN FEATURE */}
              <div className="space-y-3">
                <Label className="text-white font-semibold">📸 Foto hochladen (KI analysiert automatisch!)</Label>
                <div className="flex gap-3">
                  <input
                    type="file"
                    id="catch-photo"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading || aiAnalyzingPhoto}
                    className="hidden"
                  />
                  <label
                    htmlFor="catch-photo"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 border-2 border-cyan-500/50 text-cyan-300 rounded-lg cursor-pointer transition-all min-h-[44px]"
                  >
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Wird hochgeladen...</>
                    ) : aiAnalyzingPhoto ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />KI analysiert...</>
                    ) : (
                      <><Upload className="w-5 h-5" />Bild auswählen</>
                    )}
                  </label>
                  {photoUrl && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => setPhotoUrl("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {photoUrl && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-cyan-500/30">
                    <LazyImage src={photoUrl} alt="Fang-Vorschau" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* AUTO-FILLED STATS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">🐟 Fischart *</Label>
                  <Input
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    placeholder="z.B. Hecht, Zander..."
                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">📍 Angelspot</Label>
                  <MobileSelect
                    value={spotId}
                    onValueChange={setSpotId}
                    placeholder="Spot wählen..."
                    label="Angelspot"
                    options={[{ value: "", label: "Kein Spot" }, ...spots.map(s => ({ value: s.id, label: s.name }))]}
                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">📏 Länge (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(e.target.value)}
                    placeholder="z.B. 65"
                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">⚖️ Gewicht (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="z.B. 3.5"
                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">🎣 Verwendeter Köder</Label>
                <Input
                  value={baitUsed}
                  onChange={(e) => setBaitUsed(e.target.value)}
                  placeholder="z.B. Gummifisch, Wurm..."
                  className="bg-gray-800/50 border-cyan-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">⏰ Fangzeitpunkt</Label>
                <Input
                  type="datetime-local"
                  value={catchTime}
                  onChange={(e) => setCatchTime(e.target.value)}
                  className="bg-gray-800/50 border-cyan-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">📝 Notizen</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Wetter, Bedingungen, Besonderheiten..."
                  className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                />
              </div>

              {/* SUBMIT & SHARE */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || uploading || aiAnalyzingPhoto}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 min-h-[44px]"
                >
                  {isSaving ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Wird gespeichert...</>
                  ) : (editingCatch ? "Änderungen speichern" : "Fang speichern")}
                </Button>
                {editingCatch && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-cyan-500/30 text-cyan-300 min-h-[44px]"
                  >
                    Abbrechen
                  </Button>
                )}
              </div>

              {/* Share toggle */}
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-800/30 rounded-lg border border-cyan-500/20">
                <input
                  type="checkbox"
                  checked={shareInCommunity}
                  onChange={(e) => setShareInCommunity(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm text-gray-300">Mit Community teilen</span>
              </label>
            </form>

            {/* BETA INFO */}
            <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-orange-300">
                ⚡ <strong>BETA Feature:</strong> Die KI-gestützte automatische Ausfüllung der Stats befindet sich noch in der Beta-Phase.
                Bitte überprüfe die Ergebnisse und gib ggf. fehlende Werte manuell ein.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* STATS LINK */}
        <div className="flex justify-end">
          <Link to="/CatchStats">
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <BarChart2 className="w-4 h-4" />
              Fang-Statistiken
            </Button>
          </Link>
        </div>

        {/* HISTORY */}
        <CatchHistory
          catches={catches}
          isLoading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['catches'] })}
        />

        {/* SHARE DIALOG */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="bg-gray-900 border-cyan-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">In Community teilen?</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-gray-300">Teile deinen Fang mit der Angelgemeinschaft!</p>
              {savedCatchData?.photo_url && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-cyan-500/30">
                  <LazyImage src={savedCatchData.photo_url} alt={savedCatchData.species} className="w-full h-full object-cover" />
                </div>
              )}
              {savedCatchData && (
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 border border-cyan-500/20">
                  <p className="text-lg font-semibold text-cyan-400">{savedCatchData.species}</p>
                  {savedCatchData.length_cm && <p className="text-sm text-gray-300">📏 {savedCatchData.length_cm}cm</p>}
                  {savedCatchData.weight_kg && <p className="text-sm text-gray-300">⚖️ {savedCatchData.weight_kg}kg</p>}
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowShareDialog(false); setSavedCatchData(null); }}
                disabled={isSharing}
                className="border-cyan-500/30"
              >
                Nicht jetzt
              </Button>
              <Button
                onClick={handleShareToCommunity}
                disabled={isSharing}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {isSharing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird geteilt...</> : <><Share2 className="w-4 h-4 mr-2" />Teilen</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SwipeToRefresh>
  );
}
