import { events } from '@/api/frontendClient';

/**
 * Hook zum automatischen Tracken von Event-Aktivitäten
 * Verfolgt Trips, KI-Tool Nutzung, KI Buddy Chats, etc.
 */
export function useEventActivityTracking() {
  // Track trip completion
  const trackTripCompletion = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'trip_completed');
      if (result?.ok) {
        console.log(`[Event] +50 Punkte für Trip-Abschluss`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Trip-Aktivität:', error);
    }
  };

  // Track AI chat interaction
  const trackAIChat = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'ai_chat_interaction');
      if (result?.ok) {
        console.log(`[Event] +10 Punkte für KI-Chat`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der AI-Chat-Aktivität:', error);
    }
  };

  // Track BaitMixer use
  const trackBaitMixer = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'bait_mixer_use');
      if (result?.ok) {
        console.log(`[Event] +25 Punkte für BaitMixer Rezept`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der BaitMixer-Aktivität:', error);
    }
  };

  // Track AI photo analysis
  const trackPhotoAnalysis = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'ai_analyze');
      if (result?.ok) {
        console.log(`[Event] +15 Punkte für Foto-Analyse`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Foto-Analyse-Aktivität:', error);
    }
  };

  // Track fishing recommendation
  const trackFishingRecommendation = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'fishing_recommendation');
      if (result?.ok) {
        console.log(`[Event] +20 Punkte für Fisch-Empfehlung`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Fisch-Empfehlung-Aktivität:', error);
    }
  };

  // Track spot analysis
  const trackSpotAnalysis = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'spot_analysis');
      if (result?.ok) {
        console.log(`[Event] +15 Punkte für Gewässer-Analyse`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Spot-Analyse-Aktivität:', error);
    }
  };

  // Track weather check
  const trackWeatherCheck = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'weather_check');
      if (result?.ok) {
        console.log(`[Event] +5 Punkte für Wetter-Check`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Wetter-Check-Aktivität:', error);
    }
  };

  // Track catch submission
  const trackCatchSubmission = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'catch_logged');
      if (result?.ok) {
        console.log(`[Event] +30 Punkte für Fang-Einreichung`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Fang-Aktivität:', error);
    }
  };

  // Track trip completion
  const trackTripFinish = async (eventId) => {
    if (!eventId) return;
    try {
      const result = await events.trackActivity(eventId, 'trip_completed');
      if (result?.ok) {
        console.log(`[Event] +50 Punkte für Trip-Abschluss`);
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Trip-Aktivität:', error);
    }
  };

  return {
    trackTripCompletion,
    trackAIChat,
    trackBaitMixer,
    trackPhotoAnalysis,
    trackFishingRecommendation,
    trackSpotAnalysis,
    trackWeatherCheck,
    trackCatchSubmission,
    trackTripFinish
  };
}
