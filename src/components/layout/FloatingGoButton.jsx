import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingGoButton() {
  const { triggerHaptic } = useHaptic();
  const [currentMainAction, setCurrentMainAction] = useState(0);
  
  const ACTION_SWITCH_DURATION = 5000;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMainAction((prev) => (prev + 1) % 2);
    }, ACTION_SWITCH_DURATION);

    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = () => {
    triggerHaptic('medium');
    
    if (currentMainAction === 0) {
      window.location.href = createPageUrl('Gear');
    } else {
      window.location.href = createPageUrl('AI');
    }
  };

  const getCurrentButtonText = () => {
    return currentMainAction === 0 ? 'Go' : 'KI';
  };

  const getButtonClasses = () => {
    const baseClasses = "w-14 h-14 rounded-full text-white text-sm font-bold transition-all transform hover:scale-110 active:scale-95 relative overflow-hidden flex items-center justify-center shadow-2xl";
    
    if (currentMainAction === 0) {
      return `${baseClasses} bg-cyan-600 hover:bg-cyan-700 shadow-[0_0_20px_rgba(34,211,238,0.6)]`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-[0_0_20px_rgba(147,51,234,0.6)]`;
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`fixed bottom-24 left-4 z-50 ${getButtonClasses()}`}
      onClick={handleButtonClick}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={currentMainAction}
          initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 180 }}
          transition={{ duration: 0.3 }}
          className="text-base font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
        >
          {getCurrentButtonText()}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}