import React from 'react';
import { motion } from 'framer-motion';
import { useNavigationContext } from '@/lib/NavigationContext';

/**
 * PageTransition
 *
 * Wraps each page with a directional slide animation that mirrors native mobile
 * push/pop behavior. Forward navigation slides in from the right; back
 * navigation slides in from the left.
 *
 * AnimatePresence in the layout should use no mode (default "sync") so that
 * exit and enter animations play simultaneously — the same way iOS/Android
 * native transitions work.
 */
export default function PageTransition({ children }) {
  const { direction } = useNavigationContext();

  const xOffset = 48; // px — keep small for a snappy feel on mobile

  const variants = {
    initial: { opacity: 0, x: direction > 0 ? xOffset : -xOffset },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: direction > 0 ? -xOffset : xOffset },
  };

  return (
    <motion.main
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-gray-950"
      style={{
        minHeight: 'calc(100vh - 200px)',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        willChange: 'transform, opacity',
        // Prevent layout shift from affecting sibling elements during animation
        position: 'relative',
      }}
    >
      {children}
    </motion.main>
  );
}