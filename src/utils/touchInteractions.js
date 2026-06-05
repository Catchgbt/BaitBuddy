/**
 * Mobile touch interaction utilities
 * 
 * Replaces hover-only effects with active states.
 * Provides standardized touch feedback patterns.
 */

/**
 * Create touch-friendly button class
 * Replaces hover:* with active/focus states
 */
export const touchButtonClasses = {
  primary: 'active:scale-95 active:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400',
  secondary: 'active:scale-95 active:opacity-85 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400',
  ghost: 'active:bg-gray-700/50 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400',
  destructive: 'active:scale-95 active:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-red-400',
};

/**
 * Touch feedback hook
 * Handles haptic and audio feedback for mobile interactions
 */
export function useTouchFeedback(haptic = null, sound = null) {
  const handleTouchStart = () => {
    if (haptic) haptic('selection');
    if (sound) sound('click');
  };

  return {
    onTouchStart: handleTouchStart,
    onMouseDown: handleTouchStart, // Also works on desktop
  };
}

/**
 * Ensure minimum 44px touch targets
 */
export const minTouchTarget = {
  default: 'min-h-[44px] min-w-[44px]',
  icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',
  button: 'h-11 px-4 min-h-[44px]',
  small: 'h-10 px-3 min-h-[40px]',
};

/**
 * Form element touch helpers
 */
export const touchFormClasses = {
  input: 'min-h-[44px] text-base focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400',
  select: 'min-h-[44px] text-base focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400',
  checkbox: 'w-5 h-5 min-w-[44px] min-h-[44px] flex items-center justify-center',
  radio: 'w-5 h-5 min-w-[44px] min-h-[44px] flex items-center justify-center',
  label: 'block min-h-[44px] flex items-center cursor-pointer',
};

/**
 * Remove hover states and add active states
 */
export function normalizeInteractionClasses(classes) {
  return classes
    .replace(/hover:/g, 'active:')
    .replace(/focus:/g, 'focus-visible:')
    .replace(/group-hover:/g, 'group-active:');
}

/**
 * Detect touch capability
 */
export const isTouchDevice = () => {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer:coarse)').matches ||
      window.matchMedia('(hover:none)').matches ||
      'ontouchstart' in window)
  );
};

/**
 * Prevent accidental double-tap zoom on touch
 */
export const noDoubleTapZoom = (ref) => {
  let lastTap = 0;

  const handleTouchEnd = (e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      e.preventDefault();
    }

    lastTap = now;
  };

  if (ref?.current) {
    ref.current.addEventListener('touchend', handleTouchEnd, false);
  }

  return () => {
    if (ref?.current) {
      ref.current.removeEventListener('touchend', handleTouchEnd);
    }
  };
};