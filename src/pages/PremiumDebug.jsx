import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/entities/User";
import { getPremiumWalletStatus } from "@/functions/getPremiumWalletStatus";
import { adminSetCredits } from "@/functions/adminSetCredits";
import { adminResetWallet } from "@/functions/adminResetWallet";
import { UsageSession } from "@/entities/UsageSession";
import { PremiumEvent } from "@/entities/PremiumEvent";
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Coins, 
  Activity,
  Trash2,
  Settings
} from "lucide-react";
import { toast } from "sonner";

export default function PremiumDebug() {
  const [user, setUser] = useState(null);
  const [walletStatus, setWalletStatus] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin controls
  const [targetEmail, setTargetEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState(10000);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === 'admin');

      const wallet = await getPremiumWalletStatus();
      setWalletStatus(wallet.data);

      const sessions = await UsageSession.filter({ 
        user_id: currentUser.email 
      }).then(results => results.sort((a, b) => 
        new Date(b.started_at) - new Date(a.started_at)
      ).slice(0, 5));
      setActiveSessions(sessions);

      const events = await PremiumEvent.filter({
        user_id: currentUser.email
      }).then(results => results.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 10));
      setRecentEvents(events);

    } catch (error) {
      console.error("Error loading premium debug data:", error);
      toast.error("Fehler beim Laden der Debug-Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetCredits = async () => {
    if (!targetEmail || !creditAmount) {
      toast.error("Bitte E-Mail und Credit-Menge eingeben");
      return;
    }

    try {
      const response = await adminSetCredits({
        target_user_email: targetEmail,
        credits_amount: creditAmount
      });

      if (response.data?.ok) {
        toast.success(response.data.message);
        if (targetEmail === user.email) {
          loadData();
        }
      } else {
        toast.error(response.data?.error || "Fehler beim Setzen der Credits");
      }
    } catch (error) {
      toast.error("Fehler: " + error.message);
    }
  };

  const handleAdminResetWallet = async () => {
    if (!targetEmail) {
      toast.error("Bitte E-Mail eingeben");
      return;
    }

    if (!confirm(`Wallet für ${targetEmail} wirklich zurücksetzen?`)) {
      return;
    }

    try {
      const response = await adminResetWallet({
        target_user_email: targetEmail
      });

      if (response.data?.ok) {
        toast.success(response.data.message);
        if (targetEmail === user.email) {
          loadData();
        }
      } else {
        toast.error(response.data?.error || "Fehler beim Zurücksetzen");
      }
    } catch (error) {
      toast.error("Fehler: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Lade Premium-Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Premium Debug</h1>
            <p className="text-gray-400 mt-1">Detaillierte Übersicht deines Premium-Status</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>

        {/* Wallet Status */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Coins className="w-5 h-5 text-emerald-400" />
              Wallet-Status
              {walletStatus?.status === 'active' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Gekauft</div>
                  <div className="text-2xl font-bold text-white">
                    {walletStatus.wallet.purchased_credits.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Verbraucht</div>
                  <div className="text-2xl font-bold text-red-400">
                    {walletStatus.wallet.consumed_credits.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Verfügbar</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {walletStatus.wallet.remaining_credits.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                Keine Wallet-Daten verfügbar
              </div>
            )}

            {walletStatus?.active_session && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-300 text-sm">
                  <Activity className="w-4 h-4" />
                  <span>Aktive Session: {walletStatus.active_session.feature_id}</span>
                  <span className="ml-auto">
                    {walletStatus.active_session.billed_credits} Credits verbraucht
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Letzte Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length > 0 ? (
              <div className="space-y-2">
                {activeSessions.map((session, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{session.feature_id}</div>
                      <div className="text-gray-400 text-xs">
                        {new Date(session.started_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        session.status === 'active' ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {session.status}
                      </div>
                      <div className="text-xs text-gray-400">
                        {session.billed_credits} Credits
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                Keine Sessions vorhanden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Letzte Events</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length > 0 ? (
              <div className="space-y-2">
                {recentEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg text-sm"
                  >
                    <div>
                      <span className="text-white font-medium">{event.event_type}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(event.created_date).toLocaleString('de-DE')}
                      </span>
                    </div>
                    {event.credits_amount !== 0 && (
                      <div className={`font-mono ${
                        event.credits_amount > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {event.credits_amount > 0 ? '+' : ''}{event.credits_amount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                Keine Events vorhanden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Tools */}
        {isAdmin && (
          <Card className="glass-morphism border-amber-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Settings className="w-5 h-5" />
                Admin-Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Benutzer E-Mail"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
                <Input
                  type="number"
                  placeholder="Credit-Menge"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
                <Button
                  onClick={handleAdminSetCredits}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Credits setzen
                </Button>
              </div>
              <Button
                onClick={handleAdminResetWallet}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Wallet zurücksetzen (10.000 Credits)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}