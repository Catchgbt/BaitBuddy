import React, { useState, useEffect } from 'react';
import ARWater3D from '@/components/ar/ARWater3D';
import ARTutorial from '@/components/ar/ARTutorial';
import { base44 } from '@/api/base44Client';
import PremiumGuard from "@/components/premium/PremiumGuard";

export default function ARView() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log("User not logged in:", e);
      }
    };
    loadUser();
  }, []);

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="elite"
      feature="AR-Gewässer-Analyse"
    >
      <div className="min-h-screen bg-gray-950">
        <ARWater3D />
        <ARTutorial />
      </div>
    </PremiumGuard>
  );
}