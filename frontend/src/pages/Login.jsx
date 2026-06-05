import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bereits eingeloggte Nutzer direkt aufs Dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async () => {
    if (!email || !password) return toast.error('Bitte alle Felder ausfüllen');
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Konto erstellt! Bitte Email bestätigen.');
      } else {
        await signIn(email, password);
        navigate('/app');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">🎣 BaitBuddy</h1>
          <p className="text-gray-400 mt-2">Dein KI-Angel-Assistent</p>
        </div>
        <div className="space-y-4">
          <input
            type="email" placeholder="E-Mail" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <input
            type="password" placeholder="Passwort" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {submitting ? 'Lädt...' : isSignUp ? 'Konto erstellen' : 'Anmelden'}
          </button>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-gray-400 hover:text-white text-sm transition-colors">
            {isSignUp ? 'Bereits ein Konto? Anmelden' : 'Neu hier? Konto erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
