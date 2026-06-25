import { toast } from 'sonner';
import { Catch } from '@/entities/Catch';
import { Spot } from '@/entities/Spot';
import { resolvePage } from '@/lib/voicePages';
import { createPageUrl } from '@/utils';

const ACTION_RETRY_ATTEMPTS = 2;
const ACTION_RETRY_DELAY = 1000;

async function executeWithRetry(fn, maxAttempts = ACTION_RETRY_ATTEMPTS) {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, ACTION_RETRY_DELAY));
      }
    }
  }
  throw lastError;
}

export async function executeBuddyAction(action, context, options = {}) {
  if (!action || !action.type) {
    return { success: false, message: null };
  }

  const { navigate } = context;
  const userLocation = context.userLocation || null;
  const { retryAttempts = ACTION_RETRY_ATTEMPTS, retryDelay = ACTION_RETRY_DELAY } = options;

  try {
    if (action.type === 'navigate') {
      const target = resolvePage(action.params?.page);
      if (!target) {
        return { success: false, message: null };
      }
      navigate(createPageUrl(target));
      return { success: true, message: null };
    }

    if (action.type === 'log_catch') {
      const p = action.params || {};
      if (!p.species) {
        return {
          success: false,
          message: 'Sag mir kurz die Fischart, dann trage ich den Fang ein.',
        };
      }

      await executeWithRetry(async () => {
        await Catch.create({
          species: p.species,
          catch_time: new Date().toISOString(),
          ...(p.length_cm != null && { length_cm: Number(p.length_cm) }),
          ...(p.weight_kg != null && { weight_kg: Number(p.weight_kg) }),
          ...(p.bait_used && { bait_used: p.bait_used }),
          ...(p.notes && { notes: p.notes }),
        });
      }, retryAttempts);

      toast.success(`Fang eingetragen: ${p.species}`);
      return { success: true, message: null };
    }

    if (action.type === 'add_spot' || action.type === 'save_spot') {
      const p = action.params || {};
      if (!p.name) {
        return {
          success: false,
          message: 'Wie soll der Spot heissen?',
        };
      }

      const lat = p.latitude != null ? Number(p.latitude) : userLocation?.latitude;
      const lng = p.longitude != null ? Number(p.longitude) : userLocation?.longitude;

      if (lat == null || lng == null) {
        return {
          success: false,
          message:
            'Ich brauche deinen Standort fuer den Spot. Aktiviere die Ortung und versuche es erneut.',
        };
      }

      await executeWithRetry(async () => {
        await Spot.create({
          name: p.name,
          latitude: lat,
          longitude: lng,
          water_type: p.water_type || 'see',
          notes: p.notes || '',
        });
      }, retryAttempts);

      toast.success(`Spot gespeichert: ${p.name}`);
      return { success: true, message: null };
    }

    return { success: false, message: null };
  } catch (error) {
    console.error('Buddy action failed:', error?.message);
    toast.error('Aktion fehlgeschlagen. Bitte versuche es erneut.');
    return {
      success: false,
      message: 'Das hat leider nicht geklappt. Versuch es gleich nochmal.',
    };
  }
}
