import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function Premium() {
  const { data: statusData } = useQuery({
    queryKey: ['plan'],
    queryFn: () => api.get('/api/premium/status'),
  });
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/api/premium/products'),
  });

  const currentPlan = statusData?.plan;
  const plans = products || [];

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <Star className="text-yellow-400 mx-auto mb-2" size={32} />
        <h1 className="text-2xl font-bold text-white">BaitBuddy Premium</h1>
        {currentPlan && (
          <div className="mt-2 space-y-0.5">
            <p className="text-gray-400">
              Aktuell: <span className="text-cyan-400 font-semibold">{currentPlan.name}</span>
            </p>
            {currentPlan.remaining_days != null && currentPlan.is_active && (
              <p className="text-gray-500 text-xs">Noch {currentPlan.remaining_days} Tage</p>
            )}
            {currentPlan.remaining_days != null && !currentPlan.is_active && (
              <p className="text-red-400 text-xs">Plan abgelaufen</p>
            )}
          </div>
        )}
      </div>

      {/* Free-Plan immer oben */}
      <div className={`rounded-2xl p-5 border ${currentPlan?.id === 'free' || !currentPlan ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-800 bg-gray-900/80'}`}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="font-bold text-white text-lg">Free</p>
            {(currentPlan?.id === 'free' || !currentPlan) && (
              <span className="text-xs text-cyan-400">Dein aktueller Plan</span>
            )}
          </div>
          <p className="text-white font-bold">Gratis</p>
        </div>
        <ul className="space-y-2">
          {['Fangbuch', 'Angelspots', 'Wetter-Dashboard'].map(f => (
            <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
              <Check size={14} className="text-emerald-400 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Paid Plans aus Backend */}
      {plans.map(plan => (
        <div key={plan.id} className={`rounded-2xl p-5 border ${currentPlan?.id === plan.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-800 bg-gray-900/80'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Crown className="text-yellow-400" size={18} />
              <div>
                <p className="font-bold text-white text-lg">{plan.name}</p>
                {currentPlan?.id === plan.id && (
                  <span className="text-xs text-cyan-400">Dein aktueller Plan</span>
                )}
              </div>
            </div>
            <p className="text-white font-bold">€{plan.price}/Monat</p>
          </div>
          <ul className="space-y-2">
            {plan.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                <Check size={14} className="text-emerald-400 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {currentPlan?.id !== plan.id && (
            <button
              onClick={() => toast.info('Zahlungsfunktion kommt bald!')}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all text-sm">
              {plan.name} abonnieren
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
