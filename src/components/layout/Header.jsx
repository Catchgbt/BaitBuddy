import React, { useState, useEffect } from "react";
import { Bell, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { User } from "@/entities/User";
import { FishingPlan } from "@/entities/FishingPlan";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WakeWordIndicator from "@/components/header/WakeWordIndicator";
import EventTimer from "@/components/header/EventTimer";
import LastBuddyMessage from "@/components/header/LastBuddyMessage";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mobileStack } from "@/lib/MobileStackManager";

export default function Header({
  isSidebarOpen,
  setIsSidebarOpen,
  isDemo
}) {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const navigate = useNavigate();
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [activeTripsCount, setActiveTripsCount] = useState(0);
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState([]);
  const [postIndex, setPostIndex] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);

  const loadInitialData = async () => {
    setPlanLoading(true);
    try {
      const [currentUser, planStatusResponse, plans] = await Promise.all([
        User.me(),
        base44.functions.invoke('getPlanStatus').catch(() => null),
        FishingPlan.filter({ is_active: true }).catch(() => [])
      ]);

      setUser(currentUser);
      setActiveTripsCount(plans.length);

      const alerts = currentUser?.settings?.weather_alerts || {};
      let count = 0;
      if (alerts.rain_alert_enabled) count++;
      if (alerts.wind_alert_enabled) count++;
      if (alerts.temp_alert_enabled) count++;
      if (alerts.storm_alert_enabled) count++;
      if (alerts.uv_alert_enabled) count++;
      if (alerts.visibility_alert_enabled) count++;
      if (alerts.dewpoint_alert_enabled) count++;
      setActiveAlertsCount(count);

      if (planStatusResponse?.data?.plan) {
        setCurrentPlan(planStatusResponse.data.plan);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setPlanLoading(false);
  };

  useEffect(() => {
    loadInitialData();
    loadRecentPosts();

    window.addEventListener('weather-alerts-updated', loadInitialData);
    window.addEventListener('active-trips-updated', loadInitialData);
    window.addEventListener('user-refresh-request', loadInitialData);

    return () => {
      window.removeEventListener('weather-alerts-updated', loadInitialData);
      window.removeEventListener('active-trips-updated', loadInitialData);
      window.removeEventListener('user-refresh-request', loadInitialData);
    };
  }, []);

  // Track navigation stack for back button visibility
  useEffect(() => {
    const updateCanGoBack = () => {
      setCanGoBack(mobileStack.canGoBack());
    };

    updateCanGoBack();

    // Listen for navigation changes
    const listener = mobileStack.subscribe(updateCanGoBack);
    return () => {
      if (listener) listener();
    };
  }, []);

  const loadRecentPosts = async () => {
    try {
      const posts = await base44.entities.Post.list('-created_date', 20);
      const postsWithImages = posts.filter(p => p.photo_url);
      setRecentPosts(postsWithImages);
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error);
    }
  };

  const handleLeftSidebarToggle = () => {
    triggerHaptic('selection');
    playSound('click');
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleBack = () => {
    triggerHaptic('light');
    playSound('click');
    if (mobileStack.handleAndroidBack()) {
      navigate(mobileStack.getCurrentPathname());
    }
  };

  return (
    <header 
      className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800 shadow-lg relative"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="px-4 h-16 flex items-center justify-between">
        
        {/* Animierter Plan-Name im Hintergrund - durchgehender CSS-Loop */}
        {!planLoading && currentPlan && (
          <div
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center"
            aria-hidden="true"
          >
            <div
              className="whitespace-nowrap header-plan-scroll flex"
              style={{ willChange: 'transform' }}
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`inline-block px-12 text-5xl font-bold tracking-wider ${
                    currentPlan.id === 'free' ? 'text-gray-300/40 drop-shadow-[0_0_20px_rgba(209,213,219,0.3)]' :
                    currentPlan.id === 'basic' ? 'text-blue-400/50 drop-shadow-[0_0_20px_rgba(96,165,250,0.4)]' :
                    currentPlan.id === 'pro' ? 'text-purple-400/50 drop-shadow-[0_0_20px_rgba(192,132,252,0.4)]' :
                    'text-amber-400/50 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  }`}
                >
                  {currentPlan.name} Plan
                </span>
              ))}
            </div>
            <style>{`
              @keyframes headerPlanScroll {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              .header-plan-scroll {
                animation: headerPlanScroll 18s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* Left Side - Back/Menu Button + Event Timer */}
        <div className="flex items-center gap-3 relative z-20">
          {canGoBack && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="rounded-lg"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="Zurueck zur vorherigen Seite"
                className="text-emerald-400 active:scale-95 active:bg-emerald-500/20 focus:ring-2 focus:ring-emerald-400 transition-all duration-200 min-h-[44px] min-w-[44px]"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </Button>
            </motion.div>
          )}
          
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(34, 211, 238, 0)',
                '0 0 20px 5px rgba(34, 211, 238, 0.4)',
                '0 0 0 0 rgba(34, 211, 238, 0)'
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="rounded-lg"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLeftSidebarToggle}
              aria-label={isSidebarOpen ? "Menü schliessen" : "Menü öffnen"}
              aria-expanded={isSidebarOpen}
              className="text-cyan-400 active:scale-95 active:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-400 transition-all duration-200 text-base font-bold relative overflow-hidden group min-h-[44px] min-w-[44px]"
            >
              <span className="relative z-10" aria-hidden="true">Menü</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </Button>
          </motion.div>
          <EventTimer />
        </div>

        {/* Center - Letzte Buddy-Nachricht (klickbar zum Voice Control) */}
        <div className="flex items-center gap-2 relative z-20">
          <LastBuddyMessage />
          
          {isDemo && (
            <Badge className="bg-amber-500 text-black text-xs font-bold">
              DEMO
            </Badge>
          )}
        </div>

        {/* Right Side - Wetter-Alarm, Trip-Alarm, Wake Word */}
        <div className="flex items-center gap-2 relative z-20">
          {activeAlertsCount > 0 && (
            <Link to={createPageUrl('WeatherAlerts')}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button
                   variant="ghost"
                   size="icon"
                   aria-label={`${activeAlertsCount} Wetteralarme aktiv`}
                   className="text-amber-400 active:scale-95 active:bg-amber-500/10 focus:ring-2 focus:ring-amber-400 relative min-h-[44px] min-w-[44px]"
                   onClick={() => {
                     triggerHaptic('light');
                     playSound('click');
                   }}
                 >
                   <Bell aria-hidden="true" className="w-5 h-5" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-950"
                  >
                    {activeAlertsCount}
                  </motion.div>
                </Button>
              </motion.div>
            </Link>
          )}

          {activeTripsCount > 0 && (
            <Link to={createPageUrl('TripPlanner')}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button
                   variant="ghost"
                   size="icon"
                   aria-label={`${activeTripsCount} aktive Angeltouren`}
                   className="text-emerald-400 active:scale-95 active:bg-emerald-500/10 focus:ring-2 focus:ring-emerald-400 relative min-h-[44px] min-w-[44px]"
                   onClick={() => {
                     triggerHaptic('light');
                     playSound('click');
                   }}
                 >
                   <Bell aria-hidden="true" className="w-5 h-5" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-950"
                  >
                    {activeTripsCount}
                  </motion.div>
                </Button>
              </motion.div>
            </Link>
          )}

          {recentPosts.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                   variant="ghost"
                   size="icon"
                   aria-label="Neueste Community Beitraege anzeigen"
                   className="text-cyan-400 active:scale-95 active:bg-cyan-500/10 focus:ring-2 focus:ring-cyan-400 min-h-[44px] min-w-[44px]"
                   onClick={() => {
                     triggerHaptic('light');
                     playSound('click');
                   }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500" />
                  </motion.div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-gray-900 border-gray-800">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400">Neueste Beitraege</h3>
                  {recentPosts[postIndex] && (
                    <div className="space-y-2">
                      <img 
                        src={recentPosts[postIndex].photo_url}
                        alt={`Community Post ${postIndex + 1}`}
                        loading="lazy"
                        className="w-full rounded-lg max-h-48 object-cover"
                      />
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {recentPosts[postIndex].text}
                      </p>
                      <Link to={createPageUrl('Community')}>
                        <Button size="sm" className="w-full bg-cyan-600 active:scale-95 active:bg-cyan-700 focus:ring-2 focus:ring-cyan-400 text-xs" aria-label="Zur Community gehen">
                          Zur Community
                        </Button>
                      </Link>
                    </div>
                  )}
                  {recentPosts.length > 1 && (
                    <div className="flex justify-between items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Vorheriger Beitrag"
                        onClick={() => setPostIndex(Math.max(0, postIndex - 1))}
                        disabled={postIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <span className="text-xs text-gray-400">
                        {postIndex + 1} / {recentPosts.length}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Naechster Beitrag"
                        onClick={() => setPostIndex(Math.min(recentPosts.length - 1, postIndex + 1))}
                        disabled={postIndex === recentPosts.length - 1}
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <WakeWordIndicator />
        </div>
      </div>
    </header>
  );
}