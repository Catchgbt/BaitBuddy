import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Mic } from "lucide-react";
// Removed: Coins, WifiOff, Wifi imports as they are no longer used
import { useHaptic } from "@/components/utils/HapticFeedback";
import { motion, AnimatePresence } from "framer-motion";

export default function KiBuddyBar({ onToggleChatbot, chatbotOpen, onOpenVoice }) {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { triggerHaptic } = useHaptic();
  
  const [currentMainAction, setCurrentMainAction] = useState(0);
  
  const ACTION_SWITCH_DURATION = 5000;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (userError) {
        console.warn("Could not load user data:", userError.message);
      }
    };
    
    loadData();
  }, [isOnline]);

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

  const handleBuddyClick = () => {
    triggerHaptic('heavy');
    
    if (chatbotOpen) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
    
    onToggleChatbot();
  };

  const getCurrentButtonText = () => {
    return currentMainAction === 0 ? 'Go' : 'KI';
  };

  const getButtonClasses = () => {
    const baseClasses = "w-12 h-12 rounded-full text-white text-sm font-bold transition-all transform hover:scale-105 relative overflow-hidden flex items-center justify-center";
    
    if (currentMainAction === 0) {
      return `${baseClasses} bg-cyan-600 hover:bg-cyan-700 shadow-[0_0_12px_rgba(34,211,238,0.6)]`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-[0_0_12px_rgba(147,51,234,0.6)]`;
    }
  };

  const isDemo = user?.is_demo_user;

  return (
    <>
      <div className="ki-buddy-bar-container w-full bg-gray-900 safe-area-bottom">
        <div className="flex items-center justify-between px-2 sm:px-4 py-2">
          
          {/* Left Side - Circular Action Button */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
            <button
              className={getButtonClasses()}
              onClick={handleButtonClick}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentMainAction}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                >
                  {getCurrentButtonText()}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Center - KI Buddy Icon mit BETA Badge */}
          <div 
            className="flex-shrink-0 cursor-pointer select-none hover:scale-110 transition-transform mx-2 relative"
            onClick={handleBuddyClick}
          >
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center transform transition-all hover:rotate-12 shadow-lg ${
                chatbotOpen ? 'animate-pulse scale-110 ring-2 ring-purple-400' : 'animate-pulse'
              }`}>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/dcd615030_Screenshot_20250919_164159_Gallery.jpg" 
                  alt="KI Buddy" 
                  className="w-10 h-10 rounded-xl object-cover"
                />
                
                <div className="absolute -top-1 -right-1">
                  <div className={`w-3 h-3 rounded-full ${
                    chatbotOpen ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                  } border-2 border-gray-900`}></div>
                </div>

                <div className={`absolute -top-1.5 -left-1.5 text-yellow-400 text-sm ${
                  chatbotOpen ? 'animate-spin' : 'animate-bounce'
                }`}>
                  ✨
                </div>
              </div>
              
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900 text-red-200 border border-red-700 whitespace-nowrap">
                  BETA
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Voice Button and Status */}
          <div className="flex items-center justify-end flex-1 min-w-0 gap-3">
            <motion.button
              onClick={() => {
                triggerHaptic('heavy');
                onOpenVoice?.();
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-cyan-500/50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-5 h-5 text-white" />
            </motion.button>

            <div className="text-center">
              <div className="flex items-center gap-1">
                {isDemo ? (
                  <span className="text-base font-mono font-semibold text-amber-400">∞</span>
                ) : (
                  <span className="text-xs text-gray-400">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500">
                {isDemo ? 'Demo-Modus' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </>
  );
}