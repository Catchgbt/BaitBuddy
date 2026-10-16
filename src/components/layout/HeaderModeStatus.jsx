import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fish, ShieldCheck } from 'lucide-react';
import { FishingPlan } from '@/entities/FishingPlan';
import { usePlan } from '@/components/premium/PlanContext';

// Die Header-Anzeigen sind reine Statusindikatoren: keine Freischaltung im
// Client und kein künstlicher "aktiver" Trip. Beide Werte stammen aus den
// vorhandenen servergestützten BaitBuddy-Zuständen.
export default function HeaderModeStatus({ user }) {
  const { allToolsFree } = usePlan();
  // undefined = noch nicht bestätigt / derzeit nicht abrufbar,
  // null = sicher kein aktiver Trip, Objekt = tatsächlich aktiver Trip.
  const [activeTrip, setActiveTrip] = useState(undefined);
  const userKey = user?.id || user?.email || null;

  useEffect(() => {
    let mounted = true;
    let requestId = 0;
    setActiveTrip(undefined);

    if (!userKey) return () => { mounted = false; };

    const refresh = async () => {
      const currentRequest = ++requestId;
      try {
        const plans = await FishingPlan.list('-created_at');
        if (!mounted || currentRequest !== requestId) return;
        const active = Array.isArray(plans)
          ? plans.find((plan) => plan?.is_active === true)
          : undefined;
        setActiveTrip(Array.isArray(plans) ? (active || null) : undefined);
      } catch {
        // Kein Online-Nachweis: keinesfalls "Angelmodus aus" behaupten.
        if (mounted && currentRequest === requestId) setActiveTrip(undefined);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    window.addEventListener('active-trips-updated', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted = false;
      requestId += 1;
      window.removeEventListener('active-trips-updated', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userKey]);

  if (!allToolsFree && (!userKey || activeTrip === undefined)) return null;

  const tripActive = activeTrip?.is_active === true;

  return (
    <div className="bb-header-mode-status" aria-label="App-Status">
      {allToolsFree && (
        <span className="bb-header-mode-pill bb-header-mode-pill--unlocked" role="status">
          <ShieldCheck size={14} aria-hidden="true" />
          Alle Funktionen frei
        </span>
      )}
      {userKey && activeTrip !== undefined && (
        <Link
          className={`bb-header-mode-pill bb-header-mode-pill--fishing${tripActive ? ' is-active' : ''}`}
          to={tripActive ? '/AnglerMode' : '/TripPlanner'}
          aria-label={tripActive ? 'Angelmodus aktiv – öffnen' : 'Angelmodus starten – Trip planen'}
        >
          <Fish size={14} aria-hidden="true" />
          {tripActive ? 'Angelmodus aktiv' : 'Angelmodus starten'}
        </Link>
      )}
    </div>
  );
}
