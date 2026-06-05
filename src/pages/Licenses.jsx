import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import LicensesSection from "@/components/licenses/LicensesSection";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

function LicensesContent() {
  useFeatureTracking("lizenzen");
  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <LicensesSection />
    </div>
  );
}

export default function Licenses() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await base44.auth.me());
      } catch (e) {
        console.log("User not logged in:", e);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400">Laden...</div>
      </div>
    );
  }

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="pro"
      feature="Die Lizenzverwaltung ist ein Pro-Feature"
    >
      <LicensesContent />
    </PremiumGuard>
  );
}