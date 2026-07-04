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
  // gar keine eigene Session. Bei OAuth/Passwort-Reset läuft die Session aber
  // über DIESEN Client, der sie per autoRefreshToken im Hintergrund erneuert
  // (rotierende Refresh-Tokens). AuthCallback.jsx synct das einmalig beim
  // Login, hört danach aber nicht mehr zu — ohne diesen App-weiten Listener
  // verpasst bb_refresh jede spätere Rotation und wird irgendwann ungültig,
  // obwohl die Supabase-Session an sich noch gültig ist.
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

      const currentUser = await auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
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
