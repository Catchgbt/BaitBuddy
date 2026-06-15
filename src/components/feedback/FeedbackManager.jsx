import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import FeedbackDialog from "./FeedbackDialog";

// Manager-Component der prüft, ob Feedback angezeigt werden soll
export default function FeedbackManager() {
  const [currentFeedback, setCurrentFeedback] = useState(null);

  useEffect(() => {
    // Event-Listener für Feature-Nutzung
    const handleFeatureUsed = async (event) => {
      const { feature } = event.detail;
      
      try {
        const user = await User.me();
        
        // Prüfe ob dieses Feature bereits bewertet wurde
        const hasRated = user.feature_ratings?.[feature]?.rating;
        
        if (!hasRated) {
          // Zeige Feedback-Dialog nach kurzer Verzögerung
          setTimeout(() => {
            setCurrentFeedback(feature);
          }, 2000); // 2 Sekunden Verzögerung für bessere UX
        }
      } catch (error) {
        console.error("Fehler beim Prüfen des Feedback-Status:", error);
      }
    };

    window.addEventListener("feature-used", handleFeatureUsed);
    
    return () => {
      window.removeEventListener("feature-used", handleFeatureUsed);
    };
  }, []);

  if (!currentFeedback) return null;

  return (
    <FeedbackDialog
      feature={currentFeedback}
      onClose={() => setCurrentFeedback(null)}
    />
  );
}

// Helper-Funktion zum Triggern von Feature-Nutzung
export const triggerFeatureUsed = async (feature) => {
  try {
    const user = await User.me();
    
    // Update feature_usage wenn noch nicht vorhanden
    const usageKey = `first_${feature.replace('_', '_')}`;
    if (!user.feature_usage?.[usageKey]) {
      await User.updateMyUserData({
        feature_usage: {
          ...(user.feature_usage || {}),
          [usageKey]: new Date().toISOString()
        }
      });
    }

    // Trigger Event für Feedback-Dialog
    window.dispatchEvent(new CustomEvent("feature-used", {
      detail: { feature }
    }));
  } catch (error) {
    console.error("Fehler beim Tracken der Feature-Nutzung:", error);
  }
};