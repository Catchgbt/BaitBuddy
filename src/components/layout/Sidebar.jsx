import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { auth } from "@/api/auth";
import { AnimatePresence, motion } from "framer-motion";

import {
  X,
  LogOut,
} from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen, currentPageName, user, loading }) {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const { t } = useLanguage();

  const mainItems = [
    { name: "Dashboard", path: "Dashboard", key: "nav.dashboard" },
    { name: "Fangbuch", path: "Logbook", key: "nav.logbook" },
    { name: "Fang-Uebersicht", path: "CatchStats", key: "nav.catchstats" },
    { name: "Spots & Karte", path: "Map", key: "nav.map" },
    { name: "Wetter", path: "Weather", key: "nav.weather" },
    { name: "Event", path: "Events", key: "nav.events", isLive: true },
  ];

  const aiItems = [
    { name: "KI-Kamera & Biss", path: "AI", key: "nav.ai_camera" },
    { name: "AR-Gewässer", path: "ARView", key: "nav.ar_view" },
    { name: "AR Knoten AI", path: "ARKnotenAssistent", key: "nav.ar_knoten" },
    { name: "Satelliten-Analyse", path: "WaterAnalysis", key: "nav.water_analysis" },
    { name: "KI-Köder-Mischer", path: "BaitMixer", key: "nav.bait_mixer" },
    { name: "3D-Köderführung", path: "Koeder3D", key: "nav.lure3d" },
    { name: "KI Voice-Buddy", path: "KiBuddyBeta", key: "nav.ki_voice_buddy", isBeta: true },
  ];

  const moreItems = [
    { name: "Ausrüstung", path: "Gear", key: "nav.gear" },
    { name: "Meine Trips", path: "TripPlanner", key: "nav.trips" },
    { name: "Community", path: "Community", key: "nav.community" },
    { name: "Prüfung & Schonzeiten", path: "AngelscheinPruefungSchonzeiten", key: "nav.exam" },
    { name: "Lizenzen", path: "Licenses", key: "nav.licenses" },
    { name: "Geräte", path: "Devices", key: "nav.devices" },
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

  const renderMenuItem = (item) => {
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
                flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs leading-tight min-h-[38px] active:scale-95 focus:ring-2 focus:ring-cyan-400
                ${isActive ?
                  'bg-emerald-600 text-white font-medium active:bg-emerald-700' :
                  'text-gray-300 active:text-white active:bg-gray-700'}
              `}>
        <span>{displayText}</span>
        {item.isBeta && (
          <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
            BETA
          </span>
        )}
        {item.isLive && (
          <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            LIVE
          </span>
        )}
      </Link>
    );
  };

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
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
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
                <span className="font-semibold text-base leading-tight text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] truncate max-w-[150px]">
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
            <nav className="px-4 py-3">
              <div className="grid grid-cols-2 gap-1">
                {mainItems.map(renderMenuItem)}
              </div>

              <div className="pt-3 pb-1.5 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {t('nav.ai_tools')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {aiItems.map(renderMenuItem)}
              </div>

              <div className="my-3 h-px bg-gray-800" />
              <div className="grid grid-cols-2 gap-1">
                {moreItems.map(renderMenuItem)}
              </div>
            </nav>
          </div>

          <div className="flex-shrink-0">
            <div className="px-4 py-3 border-t border-gray-800 space-y-1.5">
              <button type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  playSound('click');
                  auth.logout(createPageUrl('Home'));
                }}
                className="flex items-center gap-3 w-full text-left px-4 py-1.5 rounded-lg transition-all text-sm text-red-400 active:text-red-300 active:bg-red-500/20 active:scale-95 focus:ring-2 focus:ring-red-400 min-h-[38px]"
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