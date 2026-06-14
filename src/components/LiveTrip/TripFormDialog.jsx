import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Save, Loader2, Crosshair } from "lucide-react";

const WATER_TYPES = ["See", "Fluss", "Teich", "Baggersee", "Kanal", "Küste / Meer", "Hafen"];
const METHODS = [
  "Spinnfischen",
  "Grundangeln",
  "Feederangeln",
  "Posenangeln",
  "Karpfenangeln",
  "Fliegenfischen",
  "Vertikalangeln",
  "Brandungsangeln",
  "Eisangeln",
  "Sonstiges",
];

// spot_info kann je nach Alter des Datensatzes ein Objekt (neu) oder ein
// String (alt) sein. Diese Helfer normalisieren beides.
function readSpot(spotInfo) {
  if (spotInfo && typeof spotInfo === "object") {
    return {
      name: spotInfo.name || "",
      water_type: spotInfo.water_type || "",
      lat: spotInfo.lat != null ? String(spotInfo.lat) : "",
      lon: spotInfo.lon != null ? String(spotInfo.lon) : "",
    };
  }
  const text = typeof spotInfo === "string" ? spotInfo : "";
  const m = text.match(/Koordinaten:\s*([\d.\-]+),\s*([\d.\-]+)/);
  return { name: text.split("\n")[0] || "", water_type: "", lat: m ? m[1] : "", lon: m ? m[2] : "" };
}

function toLocalInputs(iso) {
  if (!iso) return { date: "", time: "06:00" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "06:00" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const EMPTY = {
  title: "",
  target_fish: "",
  spotName: "",
  waterType: "",
  lat: "",
  lon: "",
  date: "",
  time: "06:00",
  durationHours: "",
  method: "",
  bait: "",
  gear: "",
  companions: "",
  checklist: "",
  notes: "",
};

function fromPlan(plan) {
  if (!plan) return { ...EMPTY };
  const spot = readSpot(plan.spot_info);
  const { date, time } = toLocalInputs(plan.planned_date);
  const details = plan.details && typeof plan.details === "object" ? plan.details : {};
  return {
    title: plan.title || "",
    target_fish: plan.target_fish || "",
    spotName: spot.name,
    waterType: spot.water_type,
    lat: spot.lat,
    lon: spot.lon,
    date,
    time,
    durationHours: details.duration_hours != null ? String(details.duration_hours) : "",
    method: details.method || "",
    bait: details.bait || "",
    gear: details.gear || "",
    companions: details.companions || "",
    checklist: Array.isArray(plan.steps) ? plan.steps.join("\n") : "",
    notes: details.notes || "",
  };
}

/**
 * Vollständiges Trip-Formular. Der Nutzer gibt hier alles an, was eine
 * Angeltour braucht — kein simpler Button mehr.
 */
export default function TripFormDialog({ open, onClose, onSave, plan, currentLocation }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(fromPlan(plan));
  }, [open, plan]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const useCurrentLocation = () => {
    if (currentLocation?.lat != null && currentLocation?.lon != null) {
      setForm((f) => ({
        ...f,
        lat: Number(currentLocation.lat).toFixed(5),
        lon: Number(currentLocation.lon).toFixed(5),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const lat = form.lat !== "" ? parseFloat(form.lat) : null;
    const lon = form.lon !== "" ? parseFloat(form.lon) : null;
    const planned_date = form.date
      ? new Date(`${form.date}T${form.time || "06:00"}`).toISOString()
      : null;

    const payload = {
      title: form.title.trim(),
      target_fish: form.target_fish.trim(),
      planned_date,
      spot_info: {
        name: form.spotName.trim(),
        water_type: form.waterType,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null,
      },
      steps: form.checklist
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      details: {
        method: form.method,
        bait: form.bait.trim(),
        gear: form.gear.trim(),
        companions: form.companions.trim(),
        duration_hours: form.durationHours !== "" ? Number(form.durationHours) : null,
        notes: form.notes.trim(),
      },
    };

    setSaving(true);
    try {
      await onSave(payload, plan?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            {plan ? "Trip bearbeiten" : "Neuen Trip planen"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Gib alle Details deiner Angeltour an — Ziel, Gewässer, Zeitpunkt, Methode und Ausrüstung.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-gray-300">Titel der Tour *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="z. B. Hechttour am Baldeneysee"
                className="bg-gray-900 border-gray-700 text-white mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-gray-300">Zielfisch</Label>
              <Input
                value={form.target_fish}
                onChange={(e) => set("target_fish")(e.target.value)}
                placeholder="z. B. Hecht, Zander"
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Angelmethode</Label>
              <Select value={form.method} onValueChange={set("method")}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Methode wählen" />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gewässer / Spot */}
          <div className="rounded-xl border border-gray-800 p-4 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
              <MapPin className="w-4 h-4" /> Gewässer & Spot
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Spot / Gewässername</Label>
                <Input
                  value={form.spotName}
                  onChange={(e) => set("spotName")(e.target.value)}
                  placeholder="z. B. Baldeneysee Nordufer"
                  className="bg-gray-900 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Gewässertyp</Label>
                <Select value={form.waterType} onValueChange={set("waterType")}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATER_TYPES.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <Label className="text-gray-300">Breitengrad (lat)</Label>
                <Input
                  value={form.lat}
                  onChange={(e) => set("lat")(e.target.value)}
                  placeholder="51.40000"
                  inputMode="decimal"
                  className="bg-gray-900 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Längengrad (lon)</Label>
                <Input
                  value={form.lon}
                  onChange={(e) => set("lon")(e.target.value)}
                  placeholder="7.00000"
                  inputMode="decimal"
                  className="bg-gray-900 border-gray-700 text-white mt-1"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={useCurrentLocation}
                disabled={currentLocation?.lat == null}
                className="border-gray-700"
                title="Aktuellen Standort übernehmen"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Standort
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Mit Koordinaten startest du später die Navigation direkt aus dem Trip.
            </p>
          </div>

          {/* Zeit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Datum</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date")(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Startzeit</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => set("time")(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Dauer (Std.)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.durationHours}
                onChange={(e) => set("durationHours")(e.target.value)}
                placeholder="z. B. 4"
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
          </div>

          {/* Ausrüstung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Köder</Label>
              <Input
                value={form.bait}
                onChange={(e) => set("bait")(e.target.value)}
                placeholder="z. B. Gummifisch 12cm, Wurm"
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Begleiter</Label>
              <Input
                value={form.companions}
                onChange={(e) => set("companions")(e.target.value)}
                placeholder="z. B. Tom, Lisa"
                className="bg-gray-900 border-gray-700 text-white mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-gray-300">Ausrüstung</Label>
              <Textarea
                value={form.gear}
                onChange={(e) => set("gear")(e.target.value)}
                placeholder="Ruten, Rollen, Schnurstärke, Kescher ..."
                className="bg-gray-900 border-gray-700 text-white mt-1 min-h-[70px]"
              />
            </div>
          </div>

          {/* Checkliste & Notizen */}
          <div>
            <Label className="text-gray-300">Packliste / Checkliste (je Zeile ein Punkt)</Label>
            <Textarea
              value={form.checklist}
              onChange={(e) => set("checklist")(e.target.value)}
              placeholder={"Angelschein\nKescher\nLebendfutter\nThermoskanne"}
              className="bg-gray-900 border-gray-700 text-white mt-1 min-h-[90px]"
            />
          </div>
          <div>
            <Label className="text-gray-300">Notizen</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Wetter, Pegelstand, Beobachtungen ..."
              className="bg-gray-900 border-gray-700 text-white mt-1 min-h-[70px]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-gray-950 pb-1">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700">
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {plan ? "Änderungen speichern" : "Trip speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
