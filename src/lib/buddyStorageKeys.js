export const BUDDY_STORAGE_KEYS = {
  WIDGET_POSITION: 'buddy-widget-pos',
  VISITED_PAGES: 'buddy-visited-pages',
  WIDGET_HIDDEN: 'buddy-widget-hidden',
  VOICE_ENABLED: 'buddy-voice-enabled',
  USER_LOCATION: 'userLocation',
  MAX_VISITED_PAGES: 100,
};

export const BUDDY_TIMEOUTS = {
  SMALL_BUBBLE: 15000,
  VOICE_RECOGNITION: 30000,
  ACTION_RETRY_DELAY: 1000,
  DRAG_THRESHOLD: 8,
  // Touch braucht mehr Toleranz: ein Fingertipp bewegt sich fast immer ein paar
  // Pixel. Bei zu kleinem Schwellenwert wird der Tap als Drag gewertet und der
  // Klick (Bubble öffnen) feuert nie – der Button fühlt sich "nicht treffbar" an.
  DRAG_THRESHOLD_TOUCH: 16,
};

export const BUDDY_AVATAR_SIZE = 96;
export const BUDDY_DRAG_DEBOUNCE = 300;
