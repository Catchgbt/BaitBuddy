import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Check, Star } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, features: ['5 Fänge/Monat', 'Basis KI-Chat', '2 Spots'] },
  { id: 'basic', name: 'Basic', price: 4.99, features: ['50 Fänge/Monat', 'Vollständiger KI-Chat', '10 Spots', 'Wettbewerbe'] },
  { id: 'pro', name: 'Pro', price: 9.99, features: ['Unbegrenzte Fänge', 'Priorisierter KI-Chat', 'Unbegrenzte Spots', 'Foto-Analyse', 'AR Features'] },
];

export default function Premium() {
  const { data } = useQuery({ queryKey: ['plan'], queryFn: () => api.post('/api/plan/status', {}) });
  const currentPlan = data?.plan;

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <Star className="text-yellow-400 mx-auto mb-2" size={32} />
        <h1 className="text-2xl font-bold text-white">BaitBuddy Premium</h1>
        {currentPlan && <p className="text-gray-400 mt-1">Aktuell: <span className="text-cyan-400">{currentPlan.name}</span></p>}
      </div>

      <div className="space-y-4">
        {PLANS.map(plan => (
          <div key={plan.id} className={`rounded-2xl p-5 border ${
            currentPlan?.id === plan.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-800 bg-gray-900/80'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-bold text-white text-lg">{plan.name}</p>
                {currentPlan?.id === plan.id && (
                  <span className="text-xs text-cyan-400">Dein aktueller Plan</span>
                )}
              </div>
              <p className="text-white font-bold">
                {plan.price === 0 ? 'Gratis' : `€${plan.price}/Monat`}
              </p>
            </div>
            <ul className="space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                  <Check size={14} className="text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan?.id !== plan.id && plan.price > 0 && (
              <button
                onClick={() => toast.info('Zahlungsfunktion kommt bald!')}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all text-sm">
                {plan.name} abonnieren
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
