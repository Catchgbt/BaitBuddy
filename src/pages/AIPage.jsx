import React, { useState, useEffect } from "react";
import CameraAnalysisSection from "@/components/ai/CameraAnalysisSection";
import BiteDetectorSection from "@/components/ai/BiteDetectorSection";
import { User } from "@/entities/User";

export default function AIPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await User.me());
      } catch (e) {
        console.log("User not logged in:", e);
      }
    };
    loadUser();
  }, []);

  // Premium-Check temporär deaktiviert - alle Features frei
  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] mb-2">
            KI-Assistent
          </h1>
          <p className="text-gray-400">
            Fischarten erkennen & Bisserkennung
          </p>
        </div>

        <CameraAnalysisSection />
        <BiteDetectorSection />
      </div>
    </div>
  );
}