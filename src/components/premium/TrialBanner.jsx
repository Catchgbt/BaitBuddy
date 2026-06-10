import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { usePlan } from './PlanContext';
import { createPageUrl } from '@/utils';

// Hinweis-Banner für den 24h-Gratis-Vollzugriff neu registrierter Nutzer.
// Nutzt is_trial / remaining_hours aus /api/premium/status (via PlanContext).
export default function TrialBanner() {
  const { plan } = usePlan();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('trial_banner_dismissed') === '1'; } catch { return false; }
  });

  if (dismissed) return null;
  if (!plan?.is_trial || !plan?.is_active) return null;

  const hours = plan.remaining_hours;
  if (hours == null || hours <= 0) return null;

  const label = hours <= 1 ? 'weniger als 1 Stunde' : `noch ${hours} Stunden`;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('trial_banner_dismissed', '1'); } catch { /* ignore */ }
  };

  return (
    <div className="relative z-40 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm px-10 py-2 flex items-center justify-center gap-2">
      <Sparkles className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-center">
        Gratis-Vollzugriff aktiv – {label}.{' '}
        <Link
          to={createPageUrl('PremiumPlans')}
          className="underline font-semibold hover:text-white/90"
        >
          Jetzt dauerhaft sichern
        </Link>
      </span>
      <button
        onClick={dismiss}
        aria-label="Hinweis schließen"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
