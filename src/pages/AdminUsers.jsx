import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [assigning, setAssigning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
      if (me.role !== "admin") {
        toast.error("Kein Zugriff. Nur Admins erlaubt.");
        return;
      }
      loadUsers();
    };
    init();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      toast.error("Fehler beim Laden der Benutzer");
    }
    setLoading(false);
  };

  const handleAssignPlan = async () => {
    if (!selectedUser || !selectedPlan) {
      toast.error("Bitte Benutzer und Plan auswählen");
      return;
    }

    setAssigning(true);
    try {
      const result = await base44.functions.invoke("adminAssignPlan", {
        target_user_id: selectedUser.id,
        plan_id: selectedPlan,
        duration_days: parseInt(durationDays) || 30
      });

      if (result?.data?.ok) {
        toast.success(`Plan ${selectedPlan} erfolgreich an ${selectedUser.email} zugewiesen`);
        setSelectedUser(null);
        setSelectedPlan("");
        loadUsers();
      } else {
        toast.error(result?.data?.error || "Fehler beim Zuweisen");
      }
    } catch (error) {
      toast.error("Fehler: " + error.message);
    }
    setAssigning(false);
  };

  const planBadgeColor = {
    free: "bg-gray-600",
    basic: "bg-blue-600",
    pro: "bg-purple-600",
    ultimate: "bg-amber-600"
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="p-6 text-center text-red-400">
        Kein Zugriff. Nur Admins.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin - Benutzerverwaltung</h1>

      {selectedUser && (
        <Card className="glass-morphism border-cyan-700/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-cyan-400">Plan zuweisen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-white font-semibold">{selectedUser.full_name || "Unbekannt"}</p>
              <p className="text-gray-400 text-sm">{selectedUser.email}</p>
              <p className="text-gray-500 text-xs mt-1">
                Aktueller Plan: {selectedUser.premium_plan_id || "free"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Plan</label>
                <MobileSelect
                  value={selectedPlan}
                  onValueChange={setSelectedPlan}
                  label="Plan waehlen"
                  placeholder="Plan waehlen"
                  options={[
                    { value: "free", label: "Free" },
                    { value: "basic", label: "Basic" },
                    { value: "pro", label: "Pro" },
                    { value: "ultimate", label: "Ultimate" },
                  ]}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Dauer (Tage)</label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={e => setDurationDays(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                  min="1"
                  max="365"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAssignPlan}
                disabled={assigning || !selectedPlan}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {assigning ? "Wird zugewiesen..." : "Plan zuweisen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setSelectedUser(null); setSelectedPlan(""); }}
                className="border-gray-700 text-gray-300"
              >
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Benutzer ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Nach E-Mail oder Name suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800/50 border-gray-700 text-white"
          />

          {loading ? (
            <div className="text-center py-8 text-gray-400">Wird geladen...</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{u.full_name || "Unbekannt"}</p>
                    <p className="text-gray-400 text-sm">{u.email}</p>
                    {u.premium_expires_at && (
                      <p className="text-gray-500 text-xs">
                        Ablauf: {new Date(u.premium_expires_at).toLocaleDateString("de-DE")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${planBadgeColor[u.premium_plan_id || "free"] || "bg-gray-600"} text-white text-xs`}>
                      {u.premium_plan_id || "free"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedUser(u); setSelectedPlan(u.premium_plan_id || "free"); }}
                      className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/30 text-xs"
                    >
                      Plan zuweisen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}