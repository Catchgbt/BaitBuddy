import React, { useState, useEffect } from 'react';
import ARWater3D from '@/components/ar/ARWater3D';
import ARTutorial from '@/components/ar/ARTutorial';
import { auth } from "@/api/auth";
import ToolGuard from "@/components/progression/ToolGuard";

export default function ARView() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log("User not logged in:", e);
      }
    };
    loadUser();
  }, []);

  return (
    <ToolGuard toolId="ar-water">
      <div className="min-h-screen bg-gray-950">
        <ARWater3D />
        <ARTutorial />
      </div>
    </ToolGuard>
  );
}