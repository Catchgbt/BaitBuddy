import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";

import {
  X,
  LogOut,
} from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen, currentPageName }) {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Fehler beim Laden der Benutzerdaten in der Sidebar:", error);
        setUser(null);
      }
      setLoading(false);
    };

    loadUser();

    const handleUserUpdate = () => {
      console.log('User refresh request received, reloading user data in sidebar.');
      loadUser();
    };

    window.addEventListener('user-refresh-request', handleUserUpdate);

    return () => {
      window.removeEventListener('user-refresh-request', handleUserUpdate);
    };
  }, []);

  const menuItems = [
    { name: "Dashboard", path: "Dashboard", key: "nav.dashboard" },
    { name: "Fangbuch", path: "Logbook", key: "nav.logbook" },
    { name: "Fang-Uebersicht", path: "CatchStats", key: "nav.catchstats" },
    { name: "Spots & Karte", path: "Map", key: "nav.map" },
    { name: "Wetter", path: "Weather", key: "nav.weather" },
    { name: "Event", path: "Events", key: "nav.events", isLive: true },
    
    // KI Tools Header
    { type: "header", key: "nav.ai_tools" },
    { name: "KI Chat-Buddy", path: "AIAssistant", key: "nav.ai_chat", indent: true },
    { name: "KI-Kamera & Biss", path: "AI", key: "nav.ai_camera", indent: true },
    { name: "AR-Gewässer", path: "ARView", key: "nav.ar_view", indent: true },
    { name: "AR Knoten AI", path: "ARKnotenAssistent", key: "nav.ar_knoten", indent: true, isBeta: true },
    { name: "KI Voice Control", path: "VoiceControl", key: "nav.ai_voice", indent: true },
    { name: "Satelliten-Analyse", path: "WaterAnalysis", key: "nav.water_analysis", indent: true },
    { name: "KI-Köder-Mischer", path: "BaitMixer", key: "nav.bait_mixer", indent: true },
    
    { name: "Ausrüstung", path: "Gear", key: "nav.gear" },
    { name: "Meine Trips", path: "TripPlanner", key: "nav.trips" },
    { name: "Community", path: "Community", key: "nav.community", isBeta: true },
    { name: "Prüfung & Schonzeiten", path: "AngelscheinPruefungSchonzeiten", key: "nav.exam" },
    { name: "Lizenzen", path: "Licenses", key: "nav.licenses" },
    { name: "Geräte", path: "Devices", key: "nav.devices", isBeta: true },
    { name: "Premium", path: "PremiumPlans", key: "nav.premium" },
    { name: "Einstellungen", path: "Settings", key: "nav.settings" },
    { name: "Profil", path: "Profile", key: "nav.profile" },
    { name: "Datenschutz", path: "Datenschutz", key: "Datenschutz" },
    { name: "Hilfe & Support", path: "Help", key: "Hilfe & Support" },

  ];

  const handleClose = () => {
    triggerHaptic('light');
    playSound('click');
    setIsOpen(false);
  };

  const handleNavClick = (item) => {
    triggerHaptic('selection');
    playSound('selection');
    setIsOpen(false);
  };

  const getProfileDisplay = () => {
    if (user?.profile_picture_url) {
      return (
        <img
          src={user.profile_picture_url}
          alt="Profil"
          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400" />
      );
    }

    const name = user?.nickname || user?.full_name || user?.email || "?";
    const initials = name.
      split(' ').
      map((n) => n[0]).
      join('').
      toUpperCase().
      slice(0, 2);

    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center border-2 border-emerald-400">
        <span className="text-white font-bold text-sm">{initials}</span>
      </div>
    );
  };

  const displayName = user?.nickname || user?.full_name || "Mein Profil";
  const isDemo = user?.is_demo_user;

  return (
    <>
      {/* Backdrop */}
      {isOpen &&
        <div
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={handleClose}
          style={{ touchAction: 'none' }} />
      }

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-[85vw] max-w-80 bg-gray-950/95 backdrop-blur-xl border-r border-gray-800 z-[9999]
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col" style={{ height: '100vh', height: '100dvh', maxHeight: '100vh', maxHeight: '100dvh' }}>
          
          <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.button
                  key="x-sidebar"
                  initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                  transition={{ duration: 0.3 }}
                  onClick={handleClose}
                  aria-label="Menü schliessen"
                  className="w-10 h-10 flex items-center justify-center text-gray-400 active:text-white active:scale-95 focus:ring-2 focus:ring-cyan-400 transition-all rounded-lg active:bg-gray-700 min-h-[44px] min-w-[44px]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>

            <Link
               to={createPageUrl("Profile")}
               onClick={() => handleNavClick({ path: 'Profile', name: 'Profil' })}
               className="flex items-center gap-3 active:opacity-60 active:scale-95 focus:ring-2 focus:ring-cyan-400 rounded-lg transition-all p-1"
             >
              <div className="flex flex-col items-end">
                <span className="font-semibold text-base leading-tight bg-gradient-to-r from-cyan-400 to-emerald-400 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] truncate max-w-[150px]">
                  {displayName}
                </span>
                <span className="text-gray-400 text-xs">
                  Profil anzeigen
                </span>
                {isDemo && (
                  <span className="text-xs font-mono font-semibold text-amber-400 mt-1">
                    ∞ Demo
                  </span>
                )}
              </div>
              {getProfileDisplay()}
            </Link>
          </div>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              minHeight: 0,
              height: '100%'
            }}
          >
            <nav className="px-5 py-4">
              <div className="space-y-0.5 mb-4">
                {menuItems.map((item, idx) => {
                  // Kategorie-Header
                  if (item.type === "header") {
                    const label = item.label || t(item.key);
                    return (
                      <div key={idx} className="pt-4 pb-2 px-4 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                          {label}
                        </span>
                        {item.key === "nav.ai_tools" && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                            BETA
                          </span>
                        )}
                      </div>
                    );
                  }

                  // Normaler Menüpunkt
                  const isActive = currentPageName === item.path;
                  let displayText = item.name;
                  if (item.key.startsWith('nav.')) {
                    const translated = t(item.key);
                    // Fallback auf item.name, wenn Key nicht übersetzt wurde
                    displayText = (translated && translated !== item.key) ? translated : item.name;
                  }

                  return (
                    <Link
                      key={item.path}
                      to={createPageUrl(item.path)}
                      onClick={() => handleNavClick(item)}
                      className={`
                              flex items-center justify-between w-full text-left px-4 py-2 rounded-lg transition-all text-sm min-h-[44px] active:scale-95 focus:ring-2 focus:ring-cyan-400
                              ${item.indent ? 'pl-8' : ''}
                              ${isActive ?
                                'bg-emerald-600 text-white font-medium active:bg-emerald-700' :
                                'text-gray-300 active:text-white active:bg-gray-700'}
                            `}>
                      <span>{displayText}</span>
                      {item.isBeta && (
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          BETA
                        </span>
                      )}
                      {item.isLive && (
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          LIVE
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          <div className="flex-shrink-0">
            <div className="p-6 border-t border-gray-800 space-y-3">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  playSound('click');
                  base44.auth.logout(createPageUrl('Home'));
                }}
                className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition-all text-sm text-red-400 active:text-red-300 active:bg-red-500/20 active:scale-95 focus:ring-2 focus:ring-red-400 min-h-[44px]"
                aria-label="Abmelden"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Abmelden
              </button>
              
              <div className="text-xs text-gray-500 text-center">
                &copy; 2024 BaitBuddy
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}