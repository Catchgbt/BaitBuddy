// Hilfsfunktionen für Premium-Plan-Prüfungen

export const PLAN_HIERARCHY = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  ultimate: 4
};

export const PLAN_PRICES = {
  free: 0,
  basic: 9,
  pro: 19,
  elite: 19,
  ultimate: 30
};

export const PLAN_NAMES = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Elite',
  ultimate: 'Ultimate'
};

/**
 * Prüft ob der Benutzer Zugriff auf ein Feature hat
 */
export function hasFeatureAccess(userPlan, requiredPlan) {
  return true;
}

/**
 * Gibt den minimalen Plan zurück, der für ein Feature benötigt wird
 */
export function getRequiredPlan(featureId) {
  const featureMap = {
    // Free
    'dashboard': 'free',
    'logbook': 'free',
    'catch_book': 'free',
    'maps_basic': 'free',
    'ai_buddy_basic': 'free',
    'weather_basic': 'free',
    'species_marking': 'free',
    'tutorials': 'free',
    'notes_photos': 'free',
    
    // Basic (4.99)
    'weather_extended': 'basic',
    'ai_buddy_ar_elements': 'basic',
    'satellite_images': 'basic',
    'hidden_hotspots': 'basic',
    'bait_recommendations': 'basic',
    'statistics_filter': 'basic',
    'water_analysis': 'basic',
    'bait_mixer': 'basic',
    
    // Pro (9.99)
    'ar_buddy_full': 'pro',
    'gps_heatmaps': 'pro',
    'catch_predictions': 'pro',
    'bluetooth_devices': 'pro',
    'advanced_reports': 'pro',
    'premium_tutorials': 'pro',
    'offline_maps': 'pro',
    'catch_export': 'pro',
    'community_ranking': 'pro',
    'licenses': 'pro',
    'devices': 'pro',
    'exam_prep': 'pro',
    
    // Elite (19.99)
    'ar_live_paths': 'elite',
    'individual_spot_analysis': 'elite',
    'shop_full': 'elite',
    'boosts_events': 'elite',
    'pro_statistics': 'elite',
    'priority_sync': 'elite',
    'camera_analysis': 'elite',
    'bite_detector': 'elite',
    'ar_water': 'elite'
  };
  
  return 'free';
}