import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  isActionNotificationsEnabled,
  setActionNotificationsEnabled,
  ensurePermission,
  getPermissionState,
  notifyAction,
} from "@/lib/actionNotifications";

const PERMISSION_LABEL = {
  granted: "Erlaubt",
  denied: "Blockiert",
  default: "Nicht gefragt",
  unsupported: "Nicht verfügbar",
};

export default function ActionNotificationSettings() {
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(isActionNotificationsEnabled());
    setPermission(getPermissionState());
  }, []);

  const handleToggle = async (next) => {
    setEnabled(next);
    setActionNotificationsEnabled(next);
    if (next && permission === "default") {
      setBusy(true);
      const result = await ensurePermission({ force: true });
      setPermission(result);
      setBusy(false);
    }
  };

  const handleAskPermission = async () => {
    setBusy(true);
    const result = await ensurePermission({ force: true });
    setPermission(result);
    setBusy(false);
    if (result === "granted") {
      toast.success("Benachrichtigungen aktiv");
    } else if (result === "denied") {
      toast.error("Benachrichtigungen blockiert", {
        description:
          "Bitte in den System-Einstellungen deines Geräts für BaitBuddy erlauben.",
        duration: 6000,
      });
    }
  };

  const handleTest = async () => {
    if (!enabled) {
      toast.info("Benachrichtigungen sind ausgeschaltet");
      return;
    }
    const note = await notifyAction("Test-Benachrichtigung", {
      body: "Bestätigungen für Trips, Fänge und Alarme erscheinen so.",
      tag: "action-notification-test",
      url: "/Settings",
    });
    if (!note) {
      const state = getPermissionState();
      setPermission(state);
      if (state === "denied") {
        toast.error("Vom System blockiert");
      } else if (state === "unsupported") {
        toast.error("Dein Browser unterstützt keine Benachrichtigungen");
      } else {
        toast.info("Bitte oben erst die System-Freigabe erteilen");
      }
    }
  };

  const permissionLabel = PERMISSION_LABEL[permission] || permission;
  const isBlocked = permission === "denied" || permission === "unsupported";

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Aktions-Benachrichtigungen
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">
          Bekomme eine System-Benachrichtigung, sobald du z. B. einen Trip
          erstellst, einen Fang einträgst oder Alarme änderst.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-start gap-3">
            {enabled ? (
              <Bell className="w-5 h-5 mt-1 text-emerald-400" />
            ) : (
              <BellOff className="w-5 h-5 mt-1 text-gray-500" />
            )}
            <div>
              <Label className="text-base text-white">
                Benachrichtigungen aktiv
              </Label>
              <p className="text-xs text-gray-400 mt-0.5">
                Steuert nur diese lokalen Bestätigungen — Wetter-Alarme sind
                separat.
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            aria-label="Aktions-Benachrichtigungen aktivieren"
            onCheckedChange={handleToggle}
            disabled={busy}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div>
            <p className="text-sm text-white">System-Freigabe</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Status im Gerät:{" "}
              <span
                className={
                  permission === "granted"
                    ? "text-emerald-400"
                    : isBlocked
                    ? "text-red-400"
                    : "text-amber-300"
                }
              >
                {permissionLabel}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleAskPermission}
            disabled={busy || permission === "granted" || permission === "unsupported"}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            {permission === "granted" ? "Freigegeben" : "Erlauben"}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={handleTest}
          className="w-full text-cyan-300 hover:bg-cyan-500/10"
        >
          Test-Benachrichtigung senden
        </Button>

        {isBlocked && (
          <p className="text-xs text-red-300/80">
            {permission === "denied"
              ? "Benachrichtigungen wurden blockiert. Erlaube sie in den System-Einstellungen deines Geräts unter Apps → BaitBuddy → Benachrichtigungen."
              : "Dein aktueller Browser unterstützt keine Benachrichtigungen. Nutze die BaitBuddy-Android-App für vollen Umfang."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
