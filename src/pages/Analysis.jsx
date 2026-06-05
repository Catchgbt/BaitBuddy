import React from "react";
import AnalysisSection from "@/components/analysis/AnalysisSection";
import { useRef } from "react";

export default function Analysis() {
  const analysisResultsRef = useRef(null);

  const announceAnalysisResult = (message) => {
    if (analysisResultsRef?.current) {
      analysisResultsRef.current.textContent = message;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div 
        ref={analysisResultsRef}
        role="region"
        aria-live="polite"
        aria-label="Analyseergebnisse"
        className="sr-only"
      />
      <div className="max-w-6xl mx-auto">
        <AnalysisSection onResultsUpdate={announceAnalysisResult} />
      </div>
    </div>
  );
}