import React from 'react';
import { motion } from 'framer-motion';
import { useNavigationContext } from '@/lib/NavigationContext';

/**
 * Enhanced PageTransition with native iOS/Android-style slide animations.
 *
 * Forward navigation (push):
 *   - Exit page slides left while fading out
 *   - Enter page slides in from right while fading in
 *
 * Backward navigation (pop):
 *   - Exit page slides right while fading out
 *   - Enter page slides in from left while fading in
 *
 * Tab switches reset direction to forward (1) for a fresh slide-in effect.
 */
export default function PageTransition({ children }) {
  const { direction } = useNavigationContext();

  const slideDistance = 48; // px — responsive slide distance for native feel

  const variants = {
    // Entry state: invisible, offset by slide distance
    initial: {
      opacity: 0,
      x: direction > 0 ? slideDistance : -slideDistance,
    },
    // Animate to: fully visible, centered
    animate: {
      opacity: 1,
      x: 0,
    },
    // Exit state: invisible, slides out in opposite direction
    exit: {
      opacity: 0,
      x: direction > 0 ? -slideDistance : slideDistance,
    },
  };

  const transition = {
    duration: 0.3,
    // easeInOutCubic gives a smooth, natural mobile feel
    ease: [0.4, 0, 0.2, 1],
  };

  return (
    <motion.main
      key="page-transition"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="bg-gray-950"
      style={{
        minHeight: 'calc(100vh - 200px)',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        // GPU acceleration for smooth animations
        willChange: 'transform, opacity',
        // Prevent layout shift from affecting siblings during animation
        position: 'relative',
        backfaceVisibility: 'hidden',
        perspective: 1000,
      }}
    >
      {children}
    </motion.main>
  );
}