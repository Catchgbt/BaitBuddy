import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Save, Loader2, Crosshair, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function TripForm({ onClose, onSave, plan, currentLocation }) {
  const [form, setForm] = useState(() => fromPlan(plan));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(fromPlan(plan));
  }, [plan]);

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
    <Card className="glass-morphism border-gray-800 max-h-[calc(100vh-120px)] flex flex-col">
      <CardHeader className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 pb-3 flex flex-row items-start justify-between shrink-0">
        <div>
          <CardTitle className="text-cyan-400">
            {plan ? "Trip aktualisieren" : "Neuen Trip erstellen"}
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            {plan ? "Bearbeite alle Details dieser Angeltour" : "Plane deine Angeltour mit allen notwendigen Informationen"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-6 overflow-y-auto flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basis Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Grundinformationen</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Titel der Tour *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => set("title")(e.target.value)}
                  placeholder="z. B. Hechttour am Baldeneysee"
                  className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Zielfisch</Label>
                  <Input
                    value={form.target_fish}
                    onChange={(e) => set("target_fish")(e.target.value)}
                    placeholder="z. B. Hecht, Zander"
                    className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Angelmethode</Label>
                  <Select value={form.method} onValueChange={set("method")}>
                    <SelectTrigger className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white rounded-lg px-4 py-3 transition-colors">
                      <SelectValue placeholder="Methode wählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-cyan-500/20">
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Gewässer / Spot */}
          <div className="space-y-4 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 border border-cyan-500/15 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Gewässer & Spot
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Spot / Gewässername</Label>
                <Input
                  value={form.spotName}
                  onChange={(e) => set("spotName")(e.target.value)}
                  placeholder="z. B. Baldeneysee Nordufer"
                  className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Gewässertyp</Label>
                <Select value={form.waterType} onValueChange={set("waterType")}>
                  <SelectTrigger className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white rounded-lg px-4 py-3 transition-colors">
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-cyan-500/20">
                    {WATER_TYPES.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Breitengrad (lat)</Label>
                  <Input
                    value={form.lat}
                    onChange={(e) => set("lat")(e.target.value)}
                    placeholder="51.40000"
                    inputMode="decimal"
                    className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Längengrad (lon)</Label>
                  <Input
                    value={form.lon}
                    onChange={(e) => set("lon")(e.target.value)}
                    placeholder="7.00000"
                    inputMode="decimal"
                    className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={useCurrentLocation}
                disabled={currentLocation?.lat == null}
                className="border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-600/10 text-cyan-400 rounded-lg"
                title="Aktuellen Standort übernehmen"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Aktuellen Standort nutzen
              </Button>
            </div>
            <p className="text-xs text-gray-500">Mit Koordinaten startest du später die Navigation direkt aus dem Trip.</p>
          </div>

          {/* Zeit */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Zeitplan</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Datum</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date")(e.target.value)}
                  className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white rounded-lg px-4 py-3 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Startzeit</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time")(e.target.value)}
                    className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white rounded-lg px-4 py-3 transition-colors"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300 block mb-2">Dauer (Std.)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.durationHours}
                    onChange={(e) => set("durationHours")(e.target.value)}
                    placeholder="z. B. 4"
                    className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ausrüstung & Köder */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Ausrüstung</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Köder</Label>
                <Input
                  value={form.bait}
                  onChange={(e) => set("bait")(e.target.value)}
                  placeholder="z. B. Gummifisch 12cm, Wurm"
                  className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-300 block mb-2">Begleiter</Label>
                <Input
                  value={form.companions}
                  onChange={(e) => set("companions")(e.target.value)}
                  placeholder="z. B. Tom, Lisa"
                  className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-300 block mb-2">Ausrüstung Details</Label>
              <Textarea
                value={form.gear}
                onChange={(e) => set("gear")(e.target.value)}
                placeholder="Ruten, Rollen, Schnurstärke, Kescher..."
                className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors min-h-[80px] resize-none"
              />
            </div>
          </div>

          {/* Checkliste & Notizen */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Vorbereitung</h3>
            <div>
              <Label className="text-sm font-medium text-gray-300 block mb-2">Packliste / Checkliste</Label>
              <Textarea
                value={form.checklist}
                onChange={(e) => set("checklist")(e.target.value)}
                placeholder="Ein Punkt pro Zeile:&#10;Angelschein&#10;Kescher&#10;Lebendfutter"
                className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors min-h-[80px] resize-none"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-300 block mb-2">Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Wetter-Vorhersage, Pegelstand, wichtige Beobachtungen..."
                className="bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/40 focus:border-cyan-400 text-white placeholder-gray-500 rounded-lg px-4 py-3 transition-colors min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-cyan-500/10">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700 hover:bg-gray-800/50">
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()} className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {plan ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
