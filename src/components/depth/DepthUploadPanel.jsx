import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { processDepthData } from "@/functions/processDepthData";
import { MobileSelect } from "@/components/ui/mobile-select";
import { toast } from "sonner";

export default function DepthUploadPanel({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [waterBodyName, setWaterBodyName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [deviceType, setDeviceType] = useState("echolot");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error("Bitte eine Datei auswaehlen");
    if (!waterBodyName.trim()) return toast.error("Bitte Gewaessernamen angeben");

    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await processDepthData({ file_url, water_body_name: waterBodyName, device_type: deviceType, is_public: isPublic });
      toast.success(res.data?.message || "Daten importiert");
      setFile(null);
      setWaterBodyName("");
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      toast.error("Fehler beim Importieren: " + err.message);
    }
    setLoading(false);
  };

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-base">Tiefendaten hochladen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">
          Unterstuetzte Formate: CSV (lat,lng,tiefe) oder GPX mit Tiefendaten. Maximale Dateigroesse: ~5000 Punkte pro Upload.
        </div>

        <div>
          <Label className="text-gray-300 text-sm">Gewaessername</Label>
          <Input
            value={waterBodyName}
            onChange={e => setWaterBodyName(e.target.value)}
            placeholder="z.B. Muggelsee, Ammersee..."
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
          />
        </div>

        <div>
          <Label className="text-gray-300 text-sm">Geraetetyp</Label>
          <MobileSelect
            value={deviceType}
            onValueChange={setDeviceType}
            label="Geraetetyp auswaehlen"
            options={[
              { value: "echolot", label: "Echolot" },
              { value: "gps_logger", label: "GPS-Logger" },
              { value: "manual", label: "Manuelle Messung" },
              { value: "app", label: "App-Messung" },
            ]}
            className="mt-1 bg-gray-800/50 border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300 text-sm">Datei (CSV oder GPX)</Label>
          <input
            type="file"
            accept=".csv,.gpx,.txt"
            onChange={e => setFile(e.target.files[0])}
            className="w-full mt-1 text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 file:cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-300">Fuer Community freigeben</div>
            <div className="text-xs text-gray-500">Andere Angler profitieren von deinen Daten</div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <Button
          onClick={handleUpload}
          disabled={loading || !file || !waterBodyName}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {loading ? "Wird importiert..." : "Hochladen und verarbeiten"}
        </Button>
      </CardContent>
    </Card>
  );
}