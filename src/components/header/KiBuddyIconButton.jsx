import React from "react";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { motion } from "framer-motion";

export default function KiBuddyIconButton({ chatbotOpen, onToggleChatbot }) {
  const { triggerHaptic } = useHaptic();

  const handleBuddyClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    triggerHaptic('heavy');
    
    // Wenn Chatbot geschlossen wird, Sprachausgabe stoppen
    if (chatbotOpen) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
    
    console.log("KI Buddy Icon clicked, toggling chatbot");
    onToggleChatbot();
  };

  return (
    <motion.button 
      onClick={handleBuddyClick}
      className="relative flex-shrink-0 cursor-pointer select-none hover:scale-110 transition-transform"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center transform transition-all ${
        chatbotOpen ? 'animate-pulse scale-105 ring-2 ring-purple-400' : ''
      }`}>
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/dcd615030_Screenshot_20250919_164159_Gallery.jpg" 
          alt="KI Buddy" 
          className="w-8 h-8 rounded-lg object-cover"
        />
        
        {/* Status indicator (red/green dot) */}
        <div className="absolute -top-1 -right-1">
          <div className={`w-2.5 h-2.5 rounded-full ${
            chatbotOpen ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'
          } border border-gray-950`}></div>
        </div>

        {/* Sparkle animation */}
        <div className={`absolute -top-1 -left-1 text-yellow-400 text-xs ${
          chatbotOpen ? 'animate-spin' : 'animate-bounce'
        }`}>
          ✨
        </div>
      </div>
    </motion.button>
  );
}