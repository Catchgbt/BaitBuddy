import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { api } from '@/api/frontendClient';

export default function AuthCallback() {
  const [status, setStatus] = useState('Anmeldung wird verarbeitet...');

  useEffect(() => {
    let unsubscribed = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (unsubscribed) return;
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        api.setToken(session.access_token);
        if (session.refresh_token) api.setRefreshToken(session.refresh_token);
        subscription.unsubscribe();
        unsubscribed = true;
        window.location.replace('/Dashboard');
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (unsubscribed) return;
      if (error) { setStatus('Fehler: ' + error.message); return; }
      if (data?.session?.access_token) {
        api.setToken(data.session.access_token);
        if (data.session.refresh_token) api.setRefreshToken(data.session.refresh_token);
        subscription.unsubscribe();
        unsubscribed = true;
        window.location.replace('/Dashboard');
      }
    }).catch((err) => {
      if (!unsubscribed) {
        setStatus('Fehler: ' + (err?.message || 'Anmeldung konnte nicht verarbeitet werden.'));
      }
    });

    const timeout = setTimeout(() => {
      if (!unsubscribed) {
        subscription.unsubscribe();
        setStatus('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
      }
    }, 15000);

    return () => {
      unsubscribed = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-sm">{status}</p>
      </div>
    </div>
  );
}
