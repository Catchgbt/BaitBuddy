import React, { useMemo, useState, useCallback } from "react";
import { FixedSizeList as VirtualList } from "react-window";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import { Badge } from "@/components/ui/badge";
import { Calendar, Camera, Edit2, Filter, MapPin, Ruler, Trash2, Upload, Weight, X, Loader2 } from "lucide-react";
import { getGuestCatches, addGuestCatch, updateGuestCatch, deleteGuestCatch } from "@/components/utils/guestMode";
import { fetchCatchesWithFallback, fetchSpotsWithFallback } from "@/components/utils/offlineDataCache";

const PAGE_SIZE = 20;
const EMPTY_FORM = {
  species: "", length_cm: "", weight_kg: "", spot_id: "",
  bait_used: "", notes: "", catch_time: new Date().toISOString().slice(0, 16), photo_url: "", is_released: false
};

export default function LogSection() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ species: "all", spot: "all", from: "", to: "" });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [page, setPage] = useState(1);

  // --- Queries ---
  const { data: catches = [], isLoading: catchesLoading } = useQuery({
    queryKey: ["catches"],
    queryFn: async () => {
      try {
        await base44.auth.me();
        setIsGuest(false);
        const { data } = await fetchCatchesWithFallback(
          () => base44.entities.Catch.list("-catch_time", PAGE_SIZE)
        );
        return data;
      } catch {
        setIsGuest(true);
        return getGuestCatches();
      }
    },
  });

  const { data: spots = [] } = useQuery({
    queryKey: ["spots"],
    queryFn: async () => {
      try {
        const { data } = await fetchSpotsWithFallback(() => base44.entities.Spot.list());
        return data;
      } catch {
        return [];
      }
    },
  });

  // --- Mutations with optimistic updates ---
  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.Catch.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["catches"] });
      const previous = queryClient.getQueryData(["catches"]);
      const optimistic = { id: `tmp-${Date.now()}`, ...payload };
      queryClient.setQueryData(["catches"], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _payload, context) => {
      queryClient.setQueryData(["catches"], context.previous);
      toast.error("Fehler beim Speichern.");
    },
    onSuccess: (newCatch) => {
      queryClient.setQueryData(["catches"], (old = []) =>
        old.map((c) => (c.id?.startsWith("tmp-") ? newCatch : c))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["catches"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => base44.entities.Catch.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["catches"] });
      const previous = queryClient.getQueryData(["catches"]);
      queryClient.setQueryData(["catches"], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, ...payload } : c))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["catches"], context.previous);
      toast.error("Fehler beim Aktualisieren.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["catches"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Catch.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["catches"] });
      const previous = queryClient.getQueryData(["catches"]);
      queryClient.setQueryData(["catches"], (old = []) => old.filter((c) => c.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["catches"], context.previous);
      toast.error("Fehler beim Loeschen.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["catches"] }),
  });

  // --- Helpers ---
  const buildPayload = () => ({
    ...form,
    length_cm: form.length_cm ? parseFloat(form.length_cm) : null,
    weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
    catch_time: new Date(form.catch_time).toISOString(),
    points_earned: form.length_cm ? (1 + Math.floor(parseFloat(form.length_cm) / 10)) : 1,
  });

  const calculateCatchCredits = (species, lengthCm) => {
    const rarityMap = { Hecht: 1.5, Zander: 1.4, Wels: 2.0, Forelle: 1.2, Karpfen: 1.3, Barsch: 1.0, Brassen: 0.8, Rotauge: 0.7 };
    const sizeBonus = lengthCm ? Math.min(lengthCm / 10, 10) : 1;
    return Math.min(Math.max(Math.round(100 * (rarityMap[species] || 1.0) * sizeBonus), 100), 1000);
  };

  const openNew = () => {
    setEditing("new");
    setForm({ ...EMPTY_FORM, catch_time: new Date().toISOString().slice(0, 16) });
  };
  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ ...c, catch_time: new Date(c.catch_time).toISOString().slice(0, 16) });
  };
  const cancelEdit = () => setEditing(null);

  const save = async () => {
    const payload = buildPayload();
    if (isGuest) {
      if (editing === "new") { addGuestCatch(payload); toast.success("Fang gespeichert (Gastmodus)."); }
      else { updateGuestCatch(editing, payload); toast.success("Fang aktualisiert."); }
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      setEditing(null);
      return;
    }
    try {
      if (editing === "new") {
        createMutation.mutate(payload);
        setEditing(null);
        try {
          const user = await base44.auth.me();
          const credits = calculateCatchCredits(form.species, parseFloat(form.length_cm));
          await base44.auth.updateMe({ credits: (user.credits || 0) + credits, total_earned: (user.total_earned || 0) + credits });
          toast.success(`Fang gespeichert! +${credits} Credits.`);
        } catch {
          toast.success("Fang gespeichert.");
        }
      } else {
        updateMutation.mutate({ id: editing, payload });
        setEditing(null);
        toast.success("Fang aktualisiert.");
      }
    } catch {
      const q = JSON.parse(localStorage.getItem("fishmaster_catch_queue") || "[]");
      q.push(payload);
      localStorage.setItem("fishmaster_catch_queue", JSON.stringify(q));
      toast.info("Offline gespeichert - wird synchronisiert.");
      setEditing(null);
    }
  };

  const remove = (c) => {
    if (isGuest) { deleteGuestCatch(c.id); queryClient.invalidateQueries({ queryKey: ["catches"] }); return; }
    deleteMutation.mutate(c.id);
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    const { file_url } = await UploadFile({ file });
    setForm((prev) => ({ ...prev, photo_url: file_url }));
    setUploading(false);
  };

  const importImageAndExtract = async (imageFile) => {
    setIsExtracting(true);
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file: imageFile });
      const extractionSchema = {
        type: "object",
        properties: {
          species: { type: "string" },
          length_cm: { type: "number" },
          weight_kg: { type: "number" },
          catch_time: { type: "string", format: "date-time" },
          bait_used: { type: "string" },
          notes: { type: "string" },
        },
        required: ["species"],
      };
      const { output } = await ExtractDataFromUploadedFile({ file_url, json_schema: extractionSchema });
      if (output) {
        setForm({
          species: output.species || "",
          length_cm: output.length_cm || "",
          weight_kg: output.weight_kg || "",
          bait_used: output.bait_used || "",
          notes: output.notes || "",
          catch_time: output.catch_time ? new Date(output.catch_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          photo_url: file_url,
          spot_id: "",
          is_released: false,
        });
        setEditing("new");
      } else {
        toast.error("Daten konnten nicht extrahiert werden.");
        openNew();
        setForm((prev) => ({ ...prev, photo_url: file_url }));
      }
    } catch {
      toast.error("Ein Fehler ist aufgetreten.");
    } finally {
      setIsExtracting(false);
      setUploading(false);
    }
  };

  const refreshData = () => queryClient.invalidateQueries({ queryKey: ["catches"] });

  const hasMore = catches.length === PAGE_SIZE * page;
  const loadMore = async () => {
    setPage((p) => p + 1);
    const { data: more } = await fetchCatchesWithFallback(
      () => base44.entities.Catch.list("-catch_time", PAGE_SIZE, PAGE_SIZE * page)
    );
    queryClient.setQueryData(["catches"], (old = []) => [...old, ...more]);
  };

  const speciesList = useMemo(() => Array.from(new Set(catches.map((c) => c.species).filter(Boolean))), [catches]);

  const filtered = useMemo(() => {
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;
    return catches.filter((c) => {
      const date = new Date(c.catch_time);
      return (
        (filters.species === "all" || c.species === filters.species) &&
        (filters.spot === "all" || c.spot_id === filters.spot) &&
        (!fromDate || date >= fromDate) &&
        (!toDate || date <= toDate)
      );
    });
  }, [catches, filters]);

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white">Fangbuch</CardTitle>
            {isGuest && (
              <p className="text-xs text-amber-400 mt-1">
                Gastmodus - Faenge werden 24 Stunden lokal gespeichert.{" "}
                <button onClick={() => base44.auth.redirectToLogin()} className="underline font-semibold hover:text-amber-300">
                  Anmelden
                </button>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isGuest && (
              <label className="inline-flex items-center">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && importImageAndExtract(e.target.files[0])} disabled={isExtracting || uploading} />
                <Button as="span" variant="outline" size="sm" className="cursor-pointer flex items-center" disabled={isExtracting || uploading}>
                  {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Bild importieren
                </Button>
              </label>
            )}
            <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={openNew}>Neuer Fang</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filter */}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Filter</span>
          </div>
          <MobileSelect
            value={filters.species}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, species: v }))}
            placeholder="Art"
            label="Fischart filtern"
            options={[{ value: "all", label: "Alle Arten" }, ...speciesList.map((s) => ({ value: s, label: s }))]}
            className="w-40 bg-gray-800/50 border-gray-700 text-white"
          />
          <MobileSelect
            value={filters.spot}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, spot: v }))}
            placeholder="Spot"
            label="Spot filtern"
            options={[{ value: "all", label: "Alle Spots" }, ...spots.map((s) => ({ value: s.id, label: s.name }))]}
            className="w-40 bg-gray-800/50 border-gray-700 text-white"
          />
          <Input type="datetime-local" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} className="bg-gray-800/50 border-gray-700 text-white" />
          <Input type="datetime-local" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} className="bg-gray-800/50 border-gray-700 text-white" />
          <Badge variant="outline" className="ml-auto">{filtered.length} von {catches.length}</Badge>
        </div>

        {/* Editor */}
        {editing && (
          <div className="p-4 rounded-xl bg-gray-800/40 mb-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Art*" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <MobileSelect
                value={form.spot_id}
                onValueChange={(v) => setForm({ ...form, spot_id: v })}
                placeholder="Spot"
                label="Spot auswaehlen"
                options={spots.map((s) => ({ value: s.id, label: s.name }))}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <Input type="number" placeholder="Laenge (cm)" value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input type="number" step="0.1" placeholder="Gewicht (kg)" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input placeholder="Koeder" value={form.bait_used} onChange={(e) => setForm({ ...form, bait_used: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input type="datetime-local" value={form.catch_time} onChange={(e) => setForm({ ...form, catch_time: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input placeholder="Notizen" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white md:col-span-2" />
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="inline-flex items-center">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} disabled={uploading} />
                  <Button as="span" variant="outline" size="sm" className="cursor-pointer" disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                    Foto {form.photo_url ? "aendern" : "hochladen"}
                  </Button>
                </label>
                {form.photo_url && <img src={form.photo_url} alt="Fang" className="mt-2 h-24 rounded-xl object-cover" />}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Abbrechen</Button>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Speichern</Button>
            </div>
          </div>
        )}

        {/* List */}
        <SwipeToRefresh onRefresh={refreshData}>
          <div>
            {catchesLoading && <div className="text-gray-400 text-sm">Lade Faenge...</div>}
            {filtered.length === 0 && !catchesLoading && <div className="text-gray-400">Keine Faenge gefunden.</div>}
            {filtered.length > 0 && (
              <VirtualList
                height={Math.min(filtered.length * 110, 550)}
                itemCount={filtered.length}
                itemSize={110}
                width="100%"
                itemData={{ filtered, spots, startEdit, remove }}
              >
                {({ index, style, data }) => {
                  const c = data.filtered[index];
                  const spotName = data.spots.find((s) => s.id === c.spot_id)?.name;
                  return (
                    <div style={{ ...style, paddingBottom: 8 }}>
                      <div className="p-3 rounded-xl bg-gray-800/40 flex items-start justify-between gap-3 h-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{c.species}</div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-300 mt-1">
                            <span>{new Date(c.catch_time).toLocaleString("de-DE")}</span>
                            {c.length_cm && <span>{c.length_cm} cm</span>}
                            {c.weight_kg && <span>{c.weight_kg} kg</span>}
                            {spotName && <span>{spotName}</span>}
                          </div>
                          {c.bait_used && <div className="text-gray-400 text-xs mt-0.5 truncate">Koeder: {c.bait_used}</div>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="icon" variant="outline" aria-label={`${c.species} bearbeiten`} onClick={() => data.startEdit(c)} className="h-8 w-8"><Edit2 aria-hidden="true" className="w-3 h-3" /></Button>
                          <Button size="icon" variant="destructive" aria-label={`${c.species} loeschen`} onClick={() => data.remove(c)} className="h-8 w-8"><Trash2 aria-hidden="true" className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </VirtualList>
            )}
            {hasMore && !filters.species && !filters.from && !filters.to && filters.spot === "all" && (
              <Button onClick={loadMore} variant="outline" className="w-full border-gray-700 text-gray-300 hover:text-white mt-2">
                Mehr laden
              </Button>
            )}
          </div>
        </SwipeToRefresh>
      </CardContent>
    </Card>
  );
}