import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function Premium() {
  useFeatureTracking("premium");
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('PremiumPlans'), { replace: true });
  }, []);

  return null;
}