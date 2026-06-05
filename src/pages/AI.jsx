import React, { Suspense, lazy } from "react";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

const CameraAnalysisSection = lazy(() => import("@/components/ai/CameraAnalysisSection"));
const BiteDetectorSection = lazy(() => import("@/components/ai/BiteDetectorSection"));

const SectionSkeleton = () => (
  <div className="w-full h-48 rounded-2xl bg-gray-800/50 animate-pulse flex items-center justify-center">
    <div className="text-gray-500 text-sm">Wird geladen...</div>
  </div>
);

export default function AI() {
  useFeatureTracking("bite_detector");
  return (
    <div className="min-h-screen bg-gray-950 px-3 sm:px-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] mb-2">
            KI-Assistent
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Fischarten erkennen & Bisserkennung
          </p>
        </div>

        <div>
          <Suspense fallback={<SectionSkeleton />}>
            <CameraAnalysisSection />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<SectionSkeleton />}>
            <BiteDetectorSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}