import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from "@/api/auth";
import { supabase } from "@/api/supabaseClient";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                                   = useState(null);
  const [isAuthenticated, setIsAuthenticated]             = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]                 = useState(true);
  const [isLoadingPublicSettings]                         = useState(false);
  const [authError, setAuthError]                         = useState(null);
  const [appPublicSettings]                               = useState(null);

  useEffect(() => { checkAppState(); }, []);

  // Login per E-Mail/Passwort läuft über den eigenen Backend-Proxy (auth.login)
  // und betrifft nur bb_token/bb_refresh — der Browser-Supabase-Client hat dabei
  // gar keine eigene Session. Bei OAuth/Passwort-Reset entsteht die Session
  // dagegen über DIESEN Client. Achtung: autoRefreshToken ist in
  // supabaseClient.js bewusst DEAKTIVIERT (der einzige aktive Refresh-Pfad ist
  // der 401-getriggerte bb_refresh in frontendClient.js), damit sich beide
  // Systeme nicht um das single-use Refresh-Token streiten. Dieser App-weite
  // Listener spiegelt daher vor allem SIGNED_IN (initialer OAuth-Login) und
  // SIGNED_OUT nach bb_token/bb_refresh; TOKEN_REFRESHED feuert von diesem
  // Client praktisch nicht, wird aber sicherheitshalber mit behandelt.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        auth.setToken(session.access_token);
        if (session.refresh_token) auth.setRefreshToken(session.refresh_token);
      } else if (event === 'SIGNED_OUT') {
        auth.setToken(null);
        auth.setRefreshToken?.(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const token = auth.getToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      // auth.me() liefert offline (Netzwerkfehler) das zwischengespeicherte
      // Profil zurück, sofern ein Token vorliegt — ein zuvor angemeldeter Nutzer
      // bleibt damit ohne Verbindung angemeldet.
      const currentUser = await auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      // Nur bei einer echten Ablehnung (401/403) die Tokens verwerfen. Bei einem
      // reinen Netzwerkfehler ohne gecachtes Profil bleibt das Token erhalten,
      // damit die Anmeldung nach Wiederkehr des Netzes automatisch greift.
      if (error.status === 401 || error.status === 403) {
        auth.setToken(null);
        auth.setRefreshToken?.(null);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    auth.setToken(null);
    auth.setRefreshToken?.(null);
    auth.clearCachedUser?.();
    // Falls die Session ueber OAuth/Passwort-Reset lief, haelt der Browser-
    // Supabase-Client sonst eine eigene, weiter auto-refreshende Session am
    // Leben, die der neue onAuthStateChange-Listener oben nach einem Logout
    // sonst wieder als bb_token zurueckschreiben wuerde.
    supabase.auth.signOut().catch(() => {});
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
