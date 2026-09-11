export const DEFAULT_NAVIGATION = ['Dashboard', 'Map', 'Community', 'Profile'];
export const NAVIGATION_OPTIONS = ['Dashboard', 'Map', 'KiBuddyBeta', 'Weather', 'Logbook', 'TripPlanner', 'Community', 'Gear', 'Profile'];
export const BUDDIES = {
  female_default: { gender: 'female', name: 'Marina', avatar: '/assets/buddy/marina-avatar.png', portrait: '/assets/buddy/marina.png', description: 'Freundlich, modern und aufmerksam.' },
  male_default: { gender: 'male', name: 'Finn', avatar: '/assets/buddy/finn.png', portrait: '/assets/buddy/finn.png', description: 'Ruhig, direkt und erfahren.' },
};
export const DEFAULT_BUDDY = { gender: 'female', avatarId: 'female_default', voiceId: 'male', tone: 'friendly', speed: 1, voiceEnabled: true };
export function normalizeBuddy(value = {}) {
  const gender = value.gender === 'male' ? 'male' : 'female';
  return { gender, avatarId: `${gender}_default`, voiceId: value.voiceId === 'female' ? 'female' : 'male',
    tone: ['friendly', 'direct', 'casual', 'professional', 'motivating'].includes(value.tone) ? value.tone : 'friendly',
    speed: Number.isFinite(value.speed) ? Math.min(1.2, Math.max(0.8, value.speed)) : 1,
    voiceEnabled: value.voiceEnabled !== false, chosen: value.chosen === true };
}
export function normalizeNavigation(value) {
  if (!Array.isArray(value)) return [...DEFAULT_NAVIGATION];
  const valid = [...new Set(value)].filter(key => NAVIGATION_OPTIONS.includes(key)).slice(0, 4);
  return valid.length ? valid : [...DEFAULT_NAVIGATION];
}
