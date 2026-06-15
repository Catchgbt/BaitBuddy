import React, { useState, useEffect } from "react";
import { premiumStatus } from "@/functions/premiumStatus";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Calendar, Eye } from "lucide-react";

export default function PremiumStatusBar() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await premiumStatus();
        setStatus(response.data);
      } catch (error) {
        console.error("Premium Status laden fehlgeschlagen:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Update alle 30 Sekunden
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg">
        <div className="text-xs text-gray-400">Status wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg">
      {status.premium_active ? (
        <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
          Free
        </Badge>
      )}
      
      <div className="flex items-center gap-1 text-xs text-gray-300">
        <Zap className="w-3 h-3 text-blue-400" />
        <span>{status.kibuddy_credits}</span>
      </div>
      
      {status.premium_minutes_left > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Calendar className="w-3 h-3" />
          <span>{status.premium_minutes_left}min</span>
        </div>
      )}
      
      {status.ads_enabled && (
        <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <Eye className="w-3 h-3 mr-1" />
          Ads
        </Badge>
      )}
    </div>
  );
}