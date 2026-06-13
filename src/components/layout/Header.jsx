import React, { useState, useEffect } from "react";
import { Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { User } from "@/entities/User";
import { FishingPlan } from "@/entities/FishingPlan";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WakeWordIndicator from "@/components/header/WakeWordIndicator";
import EventTimer from "@/components/header/EventTimer";
import LastBuddyMessage from "@/components/header/LastBuddyMessage";
import MapFeaturesBadge from "@/components/layout/MapFeaturesBadge";
import { functions } from "@/api/frontendClient";
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
  const [canGoBack, setCanGoBack] = useState(false);

  const loadInitialData = async () => {
    setPlanLoading(true);
    try {
      const [currentUser, planStatusResponse, plans] = await Promise.all([
        User.me(),
        functions.invoke('getPlanStatus').catch(() => null),
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

      const planPayload = planStatusResponse?.data ?? planStatusResponse;
      if (planPayload?.plan) {
        setCurrentPlan(planPayload.plan);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setPlanLoading(false);
  };

  useEffect(() => {
    loadInitialData();

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
      className="sticky top-0 z-50 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 shadow-lg relative"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="px-4 h-16 flex items-center justify-between">

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

          {/* Plan Status Badge */}
          {!planLoading && currentPlan && (
            <Badge
              className={`text-[10px] font-semibold whitespace-nowrap ${
                currentPlan.id === 'free' ? 'bg-gray-700 text-gray-200' :
                currentPlan.id === 'basic' ? 'bg-blue-600 text-white' :
                currentPlan.id === 'pro' ? 'bg-purple-600 text-white' :
                'bg-amber-600 text-white'
              }`}
            >
              {currentPlan.name}
            </Badge>
          )}

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

          <MapFeaturesBadge />
          <WakeWordIndicator />
        </div>
      </div>
    </header>
  );
}