import React, { useState, useEffect, useCallback } from "react";
import { api, functions } from "@/api/frontendClient";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const planBadgeStyle = {
  free: { background: 'rgba(107,114,128,.2)', color: '#9ca3af', border: '1px solid rgba(107,114,128,.3)' },
  basic: { background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' },
  pro: { background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)' },
  elite: { background: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [assigning, setAssigning] = useState(false);
  const { user: currentUser, isLoadingAuth } = useAuth();
  const [error, setError] = useState("");
  const canManageUsers = currentUser?.is_admin === true;

  const loadUsers = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      // Entity.list schluckt API-Fehler als leere Liste. Hier müssen Fehler
      // sichtbar und wiederholbar bleiben.
      const allUsers = await api.get('/api/admin/users', { signal });
      if (signal?.aborted) return;
      if (!Array.isArray(allUsers)) throw new Error("Ungültige Benutzerliste");
      setUsers(allUsers);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e.message || "Fehler beim Laden der Benutzer");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth || !canManageUsers) return;
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [isLoadingAuth, canManageUsers, currentUser?.id, loadUsers]);

  const handleAssignPlan = async () => {
    if (assigning || !canManageUsers) return;
    if (!selectedUser || !selectedPlan) {
      toast.error("Bitte Benutzer und Plan auswählen");
      return;
    }
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error("Bitte eine ganze Laufzeit zwischen 1 und 365 Tagen eingeben");
      return;
    }
    setAssigning(true);
    try {
      const result = await functions.invoke("adminAssignPlan", {
        target_user_id: selectedUser.id,
        plan_id: selectedPlan,
        duration_days: days
      });
      if (result?.ok) {
        toast.success(`Plan ${selectedPlan} erfolgreich an ${selectedUser.email} zugewiesen`);
        setSelectedUser(null);
        setSelectedPlan("");
        loadUsers();
      } else {
        toast.error(result?.error || "Fehler beim Zuweisen");
      }
    } catch (error) {
      toast.error("Fehler: " + error.message);
    }
    setAssigning(false);
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoadingAuth) return <div className="bb-page" role="status">Anmeldung wird geprüft …</div>;

  if (!canManageUsers) {
    return (
      <div className="bb-page text-center">
        <p style={{ color: '#f87171' }}>Kein Zugriff. Nur Admins.</p>
      </div>
    );
  }

  return (
    <div className="bb-page">
      <h1 className="text-2xl font-bold text-white">Admin - Benutzerverwaltung</h1>

      {selectedUser && (
        <div className="bb-card grid gap-4" style={{ borderColor: 'rgba(0,229,255,.3)' }}>
          <div className="bb-form-title">Plan zuweisen</div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,.25)' }}>
            <p className="text-white font-semibold">{selectedUser.full_name || "Unbekannt"}</p>
            <p className="text-sm" style={{ color: 'var(--bb-muted)' }}>{selectedUser.email}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--bb-muted)', opacity: 0.7 }}>
              Aktueller Plan: {selectedUser.premium_plan_id || "free"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--bb-muted)' }}>Plan</label>
              <MobileSelect
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                label="Plan waehlen"
                placeholder="Plan waehlen"
                options={[
                  { value: "free", label: "Free" },
                  { value: "basic", label: "Basic" },
                  { value: "pro", label: "Pro" },
                  { value: "elite", label: "Ultimate" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--bb-muted)' }}>Dauer (Tage)</label>
              <Input
                type="number"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAssignPlan}
              disabled={assigning || !selectedPlan}
              className="bb-action flex-1 flex items-center justify-center gap-2"
            >
              {assigning ? (
                <><Loader2 size={16} className="animate-spin" /> Wird zugewiesen...</>
              ) : "Plan zuweisen"}
            </button>
            <button
              disabled={assigning}
              onClick={() => { setSelectedUser(null); setSelectedPlan(""); }}
              className="bb-secondary flex-1"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="bb-card grid gap-4">
        <div className="font-bold text-white">Benutzer ({users.length})</div>
        <Input
          placeholder="Nach E-Mail oder Name suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
        />

        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" className="bb-secondary mt-2" onClick={() => loadUsers()}>Erneut versuchen</button>
          </div>
        ) : loading ? (
          <div className="text-center py-8" style={{ color: 'var(--bb-muted)' }}>Wird geladen...</div>
        ) : (
          <div className="grid gap-2">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--bb-border)' }}
              >
                <div>
                  <p className="text-white font-medium">{u.full_name || "Unbekannt"}</p>
                  <p className="text-sm" style={{ color: 'var(--bb-muted)' }}>{u.email}</p>
                  {u.premium_expires_at && (
                    <p className="text-xs" style={{ color: 'var(--bb-muted)', opacity: 0.7 }}>
                      Ablauf: {new Date(u.premium_expires_at).toLocaleDateString("de-DE")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={planBadgeStyle[u.premium_plan_id || "free"] || planBadgeStyle.free}
                  >
                    {u.premium_plan_id || "free"}
                  </span>
                  <button
                    disabled={assigning}
                    onClick={() => { setSelectedUser(u); setSelectedPlan(u.premium_plan_id || "free"); }}
                    className="px-2 py-1 rounded-lg text-xs"
                    style={{ border: '1px solid rgba(0,229,255,.3)', color: 'var(--bb-cyan)' }}
                  >
                    Plan zuweisen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

