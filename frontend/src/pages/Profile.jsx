import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { LogOut, LogIn, User, Crown, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: statusData } = useQuery({
    queryKey: ['plan'],
    queryFn: () => api.get('/api/premium/status'),
    enabled: !!user,
  });

  const currentPlan = statusData?.plan;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Abgemeldet');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
          <User className="text-gray-500" size={36} />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-white">Nicht angemeldet</h1>
          <p className="text-gray-400 text-sm">Melde dich an, um alle Funktionen zu nutzen</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all"
        >
          <LogIn size={18} />
          Anmelden / Registrieren
        </button>
      </div>
    );
  }

  const emailDisplay = user.email || 'Unbekannt';
  const initials = emailDisplay.slice(0, 2).toUpperCase();

  return (
    <div className="p-4 space-y-5">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4 bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
        <div className="w-14 h-14 rounded-full bg-cyan-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{emailDisplay}</p>
          <p className="text-gray-500 text-xs mt-0.5">Angler-Konto</p>
        </div>
      </div>

      {/* Plan-Status */}
      {currentPlan && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-cyan-400" size={16} />
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Aktueller Plan</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentPlan.id !== 'free' && <Crown className="text-yellow-400" size={16} />}
              <p className="text-white font-bold">{currentPlan.name}</p>
            </div>
            {currentPlan.remaining_days != null && currentPlan.is_active && (
              <span className="text-xs text-gray-500">Noch {currentPlan.remaining_days} Tage</span>
            )}
            {currentPlan.remaining_days != null && !currentPlan.is_active && (
              <span className="text-xs text-red-400">Abgelaufen</span>
            )}
          </div>
          {currentPlan.id === 'free' && (
            <button
              onClick={() => navigate('/app/premium')}
              className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Upgrade auf Premium
            </button>
          )}
        </div>
      )}

      {/* Abmelden */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-red-400 hover:bg-red-950/30 hover:border-red-800 transition-all font-medium"
      >
        <LogOut size={18} />
        Abmelden
      </button>
    </div>
  );
}
