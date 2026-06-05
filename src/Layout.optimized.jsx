import React, { useState, useEffect, lazy, Suspense } from "react";
import { usePrefetch } from "@/hooks/usePrefetch";
import SEO from "@/components/pwa/SEO";
import { LocationProvider } from "@/components/location/LocationManager";
import OfflineWrapper from "@/components/utils/OfflineWrapper";
import Header from "@/components/layout/Header";
import BottomTabs from "@/components/layout/BottomTabs";
import SubPageHeader from "@/components/layout/SubPageHeader";
import { base44 } from "@/api/base44Client";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { HapticProvider } from "@/components/utils/HapticFeedback";
import { SoundProvider } from "@/components/utils/SoundManager";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/i18n/LanguageContext";
import { PlanProvider } from "@/components/premium/PlanContext";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import PageTransition from "@/lib/PageTransitionEnhanced";
import { WakeWordDetector } from "@/components/utils/WakeWordDetector";
import { isGuestAllowedPage } from "@/components/utils/guestMode";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { MobileStackProvider } from "@/components/navigation/MobileStackManager";
import BackButtonHandler from "@/components/navigation/BackButtonHandler";

// Lazy load non-critical components (deferred until after FCP)
const Sidebar = lazy(() => import("@/components/layout/Sidebar"));
const QuickCatchDialog = lazy(() => import("@/components/log/QuickCatchDialog"));
const EnhancedTicker = lazy(() => import("@/components/layout/TipTicker"));
const FeedbackManager = lazy(() => import("@/components/feedback/FeedbackManager"));
const SupportAgentButton = lazy(() => import("@/components/layout/SupportAgentButton"));

// Critical PWA components (small, must be eager)
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdateNotification from "@/components/pwa/UpdateNotification";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";

// Fallback for lazy-loaded components
const LazyComponentFallback = () => null; // Silent fallback

export default function Layout({ children, currentPageName }) {
  const queryClient = useQueryClient();
  usePrefetch();

  return (
    <MobileStackProvider>
      <LayoutContent currentPageName={currentPageName} queryClient={queryClient}>
        {children}
      </LayoutContent>
    </MobileStackProvider>
  );
}

function LayoutContent({ children, currentPageName, queryClient }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrollPositions, setScrollPositions] = useState({});
  const [previousPage, setPreviousPage] = useState(null);
  const [wakeWordDetector, setWakeWordDetector] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState({
    isActive: false,
    mode: null,
    isListening: false,
    error: null
  });

  // Dark mode detection
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyDarkMode = (isDark) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyDarkMode(darkModeQuery.matches);
    darkModeQuery.addEventListener('change', (e) => applyDarkMode(e.matches));
    return () => darkModeQuery.removeEventListener('change', (e) => applyDarkMode(e.matches));
  }, []);

  // OPTIMIZED: Deferred user fetch (does not block FCP)
  useEffect(() => {
    if (currentPageName === 'Home') return;

    const fetchUserData = async () => {
      try {
        let currentUser = await base44.auth.me();
        if (currentUser && !currentUser.first_open_at) {
          await base44.auth.updateMe({ first_open_at: new Date().toISOString() });
          currentUser = { ...currentUser, first_open_at: new Date().toISOString() };
        }
        setUser(currentUser);
        window.dispatchEvent(new CustomEvent('user-refresh-request'));
      } catch (error) {
        console.warn("User fetch failed:", error);
        setUser(null);
      }
    };

    // Deferred using requestIdleCallback or setTimeout
    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(() => fetchUserData(), { timeout: 2000 });
      return () => cancelIdleCallback(handle);
    } else {
      const timeoutId = setTimeout(fetchUserData, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [currentPageName]);

  // OPTIMIZED: Non-blocking UsageSession tracking
  useEffect(() => {
    if (!user?.email) return;

    const sessionId = `app_general_${user.email}_${Date.now()}`;
    base44.entities.UsageSession.create({
      session_id: sessionId,
      user_id: user.email,
      feature_id: 'app_general',
      started_at: new Date().toISOString(),
      status: 'active',
      last_heartbeat: new Date().toISOString()
    }).catch(err => console.debug('Session tracking failed:', err.message));

    const heartbeat = setInterval(async () => {
      try {
        await Promise.race([
          base44.entities.UsageSession.update(sessionId, {
            last_heartbeat: new Date().toISOString()
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
      } catch (error) {
        console.debug('Heartbeat failed:', error.message);
      }
    }, 30000);

    const stopSession = () => {
      try {
        base44.entities.UsageSession.update(sessionId, {
          status: 'stopped',
          stopped_at: new Date().toISOString()
        }).catch(() => {});
      } catch (error) {}
    };

    window.addEventListener('beforeunload', stopSession);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', stopSession);
      stopSession();
    };
  }, [user?.email]);

  // Voice control and page tracking
  useEffect(() => {
    const handleToggleVoiceControl = () => {
      if (window.location.pathname.includes('VoiceControl')) {
        return;
      }
      if (!wakeWordDetector) {
        const detector = new WakeWordDetector(
          'Hey Buddy',
          () => window.dispatchEvent(new CustomEvent('wake-word-detected')),
          (status, error) => {
            setVoiceStatus({
              isActive: true,
              mode: detector.currentMode,
              isListening: detector.isListening,
              error: error
            });
          },
          'auto'
        );
        setWakeWordDetector(detector);
        detector.start();
      } else {
        if (wakeWordDetector.isListening) {
          wakeWordDetector.stop();
          setVoiceStatus({ isActive: false, mode: null, isListening: false, error: null });
          setWakeWordDetector(null);
        } else {
          wakeWordDetector.start();
        }
      }
    };

    const handleWakeWordStatusChange = (event) => {
      if (event.detail) setVoiceStatus(event.detail);
    };

    window.addEventListener('toggle-voice-control', handleToggleVoiceControl);
    window.addEventListener('wake-word-status-change', handleWakeWordStatusChange);

    if (window.location.pathname.includes('VoiceControl') && wakeWordDetector?.isListening) {
      wakeWordDetector.stop();
      setWakeWordDetector(null);
    }

    return () => {
      window.removeEventListener('toggle-voice-control', handleToggleVoiceControl);
      window.removeEventListener('wake-word-status-change', handleWakeWordStatusChange);
      if (wakeWordDetector) wakeWordDetector.stop();
    };
  }, [wakeWordDetector, currentPageName]);

  // Service Worker registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/api/functions/serviceWorker', { scope: '/' })
          .then((registration) => {
            console.log('[Catchly] Service Worker registered');
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('sw-update-available'));
                }
              });
            });
          })
          .catch((error) => console.error('[Catchly] Service Worker failed:', error));
      });
    }
  }, []);

  // Page scroll position management
  useEffect(() => {
    if (previousPage && previousPage !== currentPageName) {
      setScrollPositions(prev => ({ ...prev, [previousPage]: window.scrollY }));
    }
    const savedPosition = scrollPositions[currentPageName];
    if (savedPosition !== undefined) {
      setTimeout(() => window.scrollTo(0, savedPosition), 50);
    } else {
      setTimeout(() => window.scrollTo(0, 0), 50);
    }
    setPreviousPage(currentPageName);
  }, [currentPageName]);

  // Landing page
  if (currentPageName === 'Home') {
    return <><SEO />{children}</>;
  }

  const isGuest = !user;
  const isDemo = user?.is_demo_user === true;

  // Guest mode redirect
  if (isGuest && !isGuestAllowedPage(currentPageName) && currentPageName !== 'Home') {
    return (
      <PlanProvider>
        <LanguageProvider>
          <HapticProvider>
            <SoundProvider>
              <LocationProvider>
                <div className="min-h-screen bg-gray-950 text-slate-50 flex items-center justify-center p-6">
                  <SEO />
                  <Toaster />
                  <div className="max-w-md w-full text-center space-y-6">
                    <div className="text-6xl mb-4">--</div>
                    <h1 className="text-2xl font-bold text-white">Anmeldung erforderlich</h1>
                    <p className="text-gray-400">Diese Funktion ist nur für angemeldete Nutzer verfügbar.</p>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => base44.auth.redirectToLogin()} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">
                        Jetzt anmelden
                      </button>
                      <Link to={createPageUrl('Dashboard')} className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors text-center block">
                        Zurück zum Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              </LocationProvider>
            </SoundProvider>
          </HapticProvider>
        </LanguageProvider>
      </PlanProvider>
    );
  }

  // Main layout
  return (
    <>
      <BackButtonHandler />
      <PlanProvider>
        <LanguageProvider>
          <HapticProvider>
            <SoundProvider>
              <LocationProvider>
                <OfflineWrapper>
                  <div className="min-h-screen bg-gray-950 text-slate-50 relative overflow-hidden">
                    <SEO />
                    <InstallPrompt />
                    <UpdateNotification />
                    <OfflineIndicator />
                    
                    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                      <div className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 animate-glow-pulse">
                        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#f59e0b] via-[#f97316] to-[#ea580c] animate-gradient-shift" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
                      </div>
                      <div className="absolute right-0 top-1/4 transform-gpu overflow-hidden blur-3xl opacity-15 animate-glow-pulse-delayed">
                        <div className="relative aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[60deg] bg-gradient-to-tr from-[#22d3ee] via-[#06b6d4] to-[#0891b2] animate-gradient-shift-reverse" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
                      </div>
                    </div>

                    <div className="relative" style={{ zIndex: 1 }}>
                      {isDemo && <div className="bg-amber-500 text-black text-center text-xs font-bold py-1 z-50 relative">DEMO-MODUS AKTIV</div>}
                      
                      <Suspense fallback={<LazyComponentFallback />}>
                        <QuickCatchDialog />
                      </Suspense>
                      <Suspense fallback={<LazyComponentFallback />}>
                        <FeedbackManager />
                      </Suspense>
                      <Suspense fallback={<LazyComponentFallback />}>
                        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentPageName={currentPageName} />
                      </Suspense>

                      <div className="sticky top-0 z-40 bg-gray-950">
                        <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isDemo={isDemo} />
                        <Suspense fallback={<LazyComponentFallback />}>
                          <EnhancedTicker />
                        </Suspense>
                        <SubPageHeader title={currentPageName} />
                      </div>

                      <div className="w-full min-h-screen px-0 sm:px-0">
                        <SwipeToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['summary-stats'] })}>
                          <AnimatePresence initial={false}>
                            <PageTransition key={currentPageName}>
                              {children}
                            </PageTransition>
                          </AnimatePresence>
                        </SwipeToRefresh>
                      </div>

                      <BottomTabs />
                      <Suspense fallback={<LazyComponentFallback />}>
                        <SupportAgentButton />
                      </Suspense>

                      <Toaster position="bottom-center" offset="80px" expand={true} richColors={true} className="toaster-custom" toastOptions={{ duration: 4000, className: 'toast-animated' }} />
                    </div>

                    <style>{`
                      :root { --radius: 1rem; --background: 3 7 18; --foreground: 248 250 252; --catchly: #165DFF; }
                      body { background: rgb(var(--background)); color: rgb(var(--foreground)); }
                      .glass-morphism { background: rgba(15,23,42,0.7); backdrop-filter: blur(16px); border: 1px solid rgba(51,65,85,0.3); }
                      html { scroll-behavior: smooth; }
                      @keyframes gradient-shift { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-4%, 8%) scale(0.96); } }
                      @keyframes gradient-shift-reverse { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(4%, -8%) scale(0.96); } }
                      @keyframes glow-pulse { 0%, 100% { opacity: 0.2; filter: blur(80px); } 50% { opacity: 0.25; filter: blur(100px); } }
                      .animate-gradient-shift { animation: gradient-shift 20s cubic-bezier(0.42, 0, 0.58, 1) infinite; will-change: transform, opacity; }
                      .animate-gradient-shift-reverse { animation: gradient-shift-reverse 25s cubic-bezier(0.42, 0, 0.58, 1) infinite; will-change: transform, opacity; }
                      .animate-glow-pulse { animation: glow-pulse 8s cubic-bezier(0.42, 0, 0.58, 1) infinite; }
                      .animate-glow-pulse-delayed { animation: glow-pulse 8s cubic-bezier(0.42, 0, 0.58, 1) infinite; animation-delay: 2s; }
                    `}</style>
                  </div>
                </OfflineWrapper>
              </LocationProvider>
            </SoundProvider>
          </HapticProvider>
        </LanguageProvider>
      </PlanProvider>
    </>
  );
}