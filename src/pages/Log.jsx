import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import LogSection from "@/components/log/LogSection";

export default function Log() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["catches"] });
  };

  return (
    <SwipeToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-950 p-6 pb-safe">
        <div className="max-w-6xl mx-auto">
          <LogSection />
        </div>
      </div>
    </SwipeToRefresh>
  );
}