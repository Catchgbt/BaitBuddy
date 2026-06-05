import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Fish, Map, MessageCircle, BookOpen, Users } from 'lucide-react';

const features = [
  { icon: MessageCircle, title: 'KI-Assistent', desc: 'Frag den Experten – Köder, Wetter, Schonzeiten' },
  { icon: BookOpen, title: 'Fangbuch', desc: 'Dokumentiere jeden Fang mit Fotos & Daten' },
  { icon: Map, title: 'Angelkarte', desc: 'Speichere deine besten Spots mit GPS' },
  { icon: Users, title: 'Community', desc: 'Wettbewerbe & Ranglisten mit anderen Anglern' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Fish className="text-cyan-400" size={48} />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">BaitBuddy</h1>
          <p className="text-lg text-cyan-400 font-medium">Dein KI-Angel-Assistent</p>
          <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            Die smarte App für Angler – Fänge tracken, Spots speichern, KI fragen.
          </p>
        </div>

        <Link
          to="/login"
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-bold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all"
        >
          Loslegen →
        </Link>
      </div>

      {/* Features */}
      <div className="px-6 pb-12 space-y-4 max-w-md mx-auto w-full">
        <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-6">Was BaitBuddy kann</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-gray-900/80 border border-gray-800 p-4 space-y-2">
              <Icon className="text-cyan-400" size={22} />
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs pt-4">
          Bereits registriert?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
