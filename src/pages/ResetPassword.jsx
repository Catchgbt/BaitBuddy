import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  // 'checking' | 'ready' | 'invalid' | 'done'
  const [phase, setPhase] = useState('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    let invalidTimeout = null;

    // Supabase setzt aus dem Link-Hash eine Recovery-Session und feuert
    // PASSWORD_RECOVERY. Wir akzeptieren auch eine bereits bestehende Session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setPhase('ready');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setPhase('ready');
      else invalidTimeout = setTimeout(() => {
        if (active) setPhase(p => (p === 'checking' ? 'invalid' : p));
      }, 2500);
    });

    return () => {
      active = false;
      if (invalidTimeout) clearTimeout(invalidTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return; }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setSaving(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      await supabase.auth.signOut();
      setPhase('done');
    } catch (err) {
      setError(err.message || 'Zurücksetzen fehlgeschlagen. Der Link ist evtl. abgelaufen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-[340px] bg-black/75 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-center text-lg font-bold text-white mb-4">Neues Passwort festlegen</h1>

        {phase === 'checking' && (
          <p className="text-center text-sm text-gray-400">Link wird geprüft…</p>
        )}

        {phase === 'invalid' && (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-4">
              Kein gültiger Reset-Link. Bitte fordere über „Passwort vergessen?" einen neuen an.
            </p>
            <a href="/" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">Zurück zur Anmeldung</a>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center">
            <p className="text-sm text-emerald-400 mb-4">
              Dein Passwort wurde geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.
            </p>
            <a href="/" className="inline-block w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all">
              Zur Anmeldung
            </a>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Neues Passwort"
                required
                className="w-full bg-white/8 border border-white/15 rounded-xl pl-4 pr-11 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-cyan-500/60 focus:bg-white/12 transition-all"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Passwort bestätigen"
              required
              className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-cyan-500/60 focus:bg-white/12 transition-all"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 transition-all mt-1"
            >
              {saving ? 'Wird gespeichert…' : 'Passwort ändern'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
