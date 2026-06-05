// Zentrale Tracking-Utility. Speichert Events ueber die TrackingEvent-Entity.
// Fehler werden still verschluckt, damit Tracking niemals die App stoert.

import { base44 } from "@/api/base44Client";

let cachedUserId = null;

async function getUserId() {
  if (cachedUserId) return cachedUserId;
  try {
    const me = await base44.auth.me();
    cachedUserId = me?.email || "guest";
  } catch {
    cachedUserId = "guest";
  }
  return cachedUserId;
}

export async function trackPageView(pageName) {
  if (!pageName) return;
  try {
    const user_id = await getUserId();
    await base44.entities.TrackingEvent.create({
      user_id,
      event_type: "page_view",
      page_name: pageName,
    });
  } catch (e) {
    // silent
  }
}

export async function trackFeatureClick(featureId, metadata = {}) {
  if (!featureId) return;
  try {
    const user_id = await getUserId();
    await base44.entities.TrackingEvent.create({
      user_id,
      event_type: "feature_click",
      feature_id: featureId,
      metadata,
    });
  } catch (e) {
    // silent
  }
}

export function resetTrackerCache() {
  cachedUserId = null;
}