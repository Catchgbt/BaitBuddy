import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Trackt die Nutzung eines Features via UsageSession.
// Erstellt beim Mount eine Session, sendet alle 30s einen Heartbeat
// und stoppt die Session beim Unmount oder beforeunload.
export function useFeatureTracking(featureId) {
  const sessionDbIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    if (!featureId) return;

    let cancelled = false;
    let userEmail = null;

    const startSession = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email || cancelled) return;
        userEmail = user.email;

        const sessionId = `${featureId}_${user.email}_${Date.now()}`;
        const session = await base44.entities.UsageSession.create({
          session_id: sessionId,
          user_id: user.email,
          feature_id: featureId,
          started_at: new Date().toISOString(),
          status: "active",
          last_heartbeat: new Date().toISOString(),
        });

        if (cancelled) {
          base44.entities.UsageSession.update(session.id, {
            status: "stopped",
            stopped_at: new Date().toISOString(),
          });
          return;
        }

        sessionDbIdRef.current = session.id;

        heartbeatIntervalRef.current = setInterval(() => {
          if (sessionDbIdRef.current) {
            base44.entities.UsageSession.update(sessionDbIdRef.current, {
              last_heartbeat: new Date().toISOString(),
            }).catch(() => {});
          }
        }, 30000);
      } catch (error) {
        console.warn(`useFeatureTracking(${featureId}) failed:`, error);
      }
    };

    const stopSession = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (sessionDbIdRef.current) {
        base44.entities.UsageSession.update(sessionDbIdRef.current, {
          status: "stopped",
          stopped_at: new Date().toISOString(),
        }).catch(() => {});
        sessionDbIdRef.current = null;
      }
    };

    startSession();
    window.addEventListener("beforeunload", stopSession);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", stopSession);
      stopSession();
    };
  }, [featureId]);
}

export default useFeatureTracking;