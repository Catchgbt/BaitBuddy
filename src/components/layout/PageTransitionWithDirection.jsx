import React from 'react';
import { motion } from 'framer-motion';
import { useMobileStack } from '../navigation/MobileStackManager';

export default function PageTransitionWithDirection({ children }) {
  const { state } = useMobileStack();
  const direction = state.direction;

  const getVariants = () => {
    switch (direction) {
      case 'pop':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 100 }
        };
      case 'push':
        return {
          initial: { opacity: 0, x: -100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 }
        };
      case 'tab-switch':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 20 }
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  const variants = getVariants();

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}