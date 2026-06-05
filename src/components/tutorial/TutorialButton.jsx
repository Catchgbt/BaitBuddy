import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TutorialButton({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      onClick={onClick}
      className="fixed top-8 right-8 z-50 group"
      title="Tutorial starten"
    >
      {/* Dreieck-Form mit CSS */}
      <div className="relative">
        {/* Äußeres Dreieck (Border/Glow) */}
        <div 
          className="w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[70px] border-b-amber-500 group-hover:border-b-amber-400 transition-all duration-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] group-hover:drop-shadow-[0_0_25px_rgba(245,158,11,0.9)]"
        />
        
        {/* Inneres Dreieck (Hintergrund) */}
        <div 
          className="absolute top-[3px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[36px] border-l-transparent border-r-[36px] border-r-transparent border-b-[63px] border-b-gray-900"
        />
        
        {/* Icon im Zentrum */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4">
          <AlertTriangle className="w-8 h-8 text-amber-400 group-hover:text-amber-300 transition-colors animate-pulse" />
        </div>
      </div>
    </motion.button>
  );
}