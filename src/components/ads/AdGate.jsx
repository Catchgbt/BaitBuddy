import React, { useState, useCallback, useRef, createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlan } from '@/components/premium/PlanContext';
import { useAuth } from '@/lib/AuthContext';
import { getAdCapabilities, isAdAllowedOnRoute, isAdAllowedInContext, MAIN_TOOL_ROUTES } from '@/lib/adEntitlements';
import { canShowInterstitial, } from '@/components/ads/InterstitialAd';
import { getAdConfig, loadAdConfig, updateAdConfig } from '@/lib/adConfig';
import { trackAdEvent } from '@/lib/adAnalytics';
import { APP_SETTINGS_EVENT } from '@/lib/appSettings';
import { getActiveAdContexts, subscribeAdContexts } from '@/lib/adActiveContext';

const AdGateContext = createContext(null);
const CONFIG_REFRESH_MS = 30_000;

/**
 * AdGate Provider — zentrales Ad-Routing.
 * Hält Ad-Capabilities, pending Interstitials und steuert
 * alle Ad-Entscheidungen zentral.
 */
export function AdGateProvider({ children }) {
  const { plan, loading: planLoading } = usePlan();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [pendingInterstitial, setPendingInterstitial] = useState(null);
  const prevPathRef = useRef(location.pathname);
  // Hauptschalter aus dem Admin-Bereich (/api/ads/config → ads_enabled).
  const [config, setConfig] = useState(getAdConfig);
  // Laufende, nicht unterbrechbare Sessions (Drill/Bisserkennung, Kamera,
  // Sprachausgabe …) melden sich über setAdContextActive an — unabhängig von
  // der Route, z.B. wenn die Bisserkennung auf einer sonst unauffälligen Seite läuft.
  const [activeAdContexts, setActiveAdContexts] = useState(() => getActiveAdContexts());

  useEffect(() => subscribeAdContexts(setActiveAdContexts), []);

  // Auch bereits geöffnete Apps übernehmen den Admin-Schalter. Im Hintergrund
  // keine Abfragen; beim Wiederöffnen sofort frisch laden (Capacitor-Resume).
  useEffect(() => {
    let active = true;
    const refresh = (fresh) => {
      loadAdConfig({ fresh }).then(cfg => {
        if (active) setConfig(cfg);
      });
    };
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') refresh(true);
    };
    refresh(false);
    const timer = setInterval(refreshVisible, CONFIG_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('focus', refreshVisible);
    // Schaltet der Superuser um, gilt es auf seinem Gerät sofort.
    const onSettings = (event) => {
      if (typeof event.detail?.ads_enabled === 'boolean') {
        setConfig(updateAdConfig({ ads_enabled: event.detail.ads_enabled }));
      }
    };
    window.addEventListener(APP_SETTINGS_EVENT, onSettings);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener(APP_SETTINGS_EVENT, onSettings);
    };
  }, []);

  const capabilities = React.useMemo(
    () => getAdCapabilities(plan?.id ?? 'free', isAuthenticated, { adsEnabled: config.ads_enabled !== false }),
    [plan?.id, isAuthenticated, config.ads_enabled]
  );

  const adsAllowed = !planLoading
    && isAdAllowedOnRoute(location.pathname)
    && isAdAllowedInContext(activeAdContexts);
  const interstitialAllowed = adsAllowed && capabilities.interstitialAds && config.guest_interstitial_enabled;
  const bannerAllowed = adsAllowed && capabilities.bannerAds && config.basic_banner_enabled;

  // Laufende Anzeigen sofort entfernen, wenn der Admin abschaltet, der Plan
  // wechselt oder eine geschützte Route/Session beginnt.
  useEffect(() => {
    if (!interstitialAllowed || pendingInterstitial?.targetPath !== location.pathname) {
      setPendingInterstitial(null);
    }
  }, [interstitialAllowed, location.pathname, pendingInterstitial]);

  // Interstitial-Guard bei Navigation
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = prevPathRef.current;
    prevPathRef.current = currentPath;

    // Nur echte Seitenwechsel: weder App-Start noch Config-/Kontext-Updates
    // auf derselben Seite dürfen eine neue Werbeunterbrechung auslösen.
    if (previousPath === currentPath) return;

    // Nur Gäste mit Interstitials
    if (!interstitialAllowed) return;
    if (!MAIN_TOOL_ROUTES.has(currentPath)) return;
    // Nur beim Wechsel zwischen Haupttools
    if (!MAIN_TOOL_ROUTES.has(previousPath)) return;

    if (!canShowInterstitial(config.guest_interstitial_cooldown_s ?? 120)) return;

    trackAdEvent('ad_requested', {
      ad_type: 'interstitial',
      source_tool: previousPath,
      target_tool: currentPath,
      user_plan: 'guest',
    });

    setPendingInterstitial({ sourceTool: previousPath, targetPath: currentPath });
  }, [location.pathname, interstitialAllowed, config.guest_interstitial_cooldown_s]);

  const dismissInterstitial = useCallback(() => {
    setPendingInterstitial(null);
  }, []);

  return (
    <AdGateContext.Provider value={{
      capabilities,
      bannerAllowed,
      pendingInterstitial: interstitialAllowed && pendingInterstitial?.targetPath === location.pathname ? pendingInterstitial : null,
      dismissInterstitial,
    }}>
      {children}
    </AdGateContext.Provider>
  );
}

export function useAdGate() {
  const ctx = useContext(AdGateContext);
  if (!ctx) throw new Error('useAdGate must be used within AdGateProvider');
  return ctx;
}
