import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth } from "@/api/auth";
import { supabase } from "@/api/supabaseClient";
import { entities } from "@/api/frontendClient";
import { hasGuestData, migrateGuestData } from "@/lib/guestStore";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                                   = useState(null);
  const [isAuthenticated, setIsAuthenticated]             = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]                 = useState(true);
  const [isLoadingPublicSettings]                         = useState(false);
  const [authError, setAuthError]                         = useState(null);
  const [appPublicSettings]                               = useState(null);
  const authCheckId = useRef(0);
  const loggedOut = useRef(false);

  useEffect(() => {
    void checkAppState();
    const onStorage = (event) => {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key !== null && event.key !== 'bb_token') return;
      loggedOut.current = !auth.getToken();
      void checkAppState();
    };
    // Nach einem vorübergehenden Ausfall ohne Profil-Cache erneut prüfen.
    const onOnline = () => { if (auth.getToken()) void checkAppState(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    return () => {
      authCheckId.current++;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Profiländerungen (auth.updateMe) sofort übernehmen — sonst zeigten
  // Buddy-Begrüßung, Einstellungen und Avatar bis zum Neuladen den alten Stand.
  useEffect(() => {
    const onUserUpdated = (event) => {
      const updated = event?.detail;
      if (!updated?.id) return;
      setUser(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    };
    window.addEventListener('bb-user-updated', onUserUpdated);
    return () => window.removeEventListener('bb-user-updated', onUserUpdated);
  }, []);

  // Login per E-Mail/Passwort läuft über den eigenen Backend-Proxy (auth.login)
  // und betrifft nur bb_token/bb_refresh — der Browser-Supabase-Client hat dabei
  // gar keine eigene Session. Bei OAuth/Passwort-Reset entsteht die Session
  // dagegen über DIESEN Client. Achtung: autoRefreshToken ist in
  // supabaseClient.js bewusst DEAKTIVIERT (der einzige aktive Refresh-Pfad ist
  // der 401-getriggerte bb_refresh in frontendClient.js), damit sich beide
  // Systeme nicht um das single-use Refresh-Token streiten.
  // Die Browser-Session darf eine inzwischen vom Backend erneuerte Sitzung
  // nicht mit ihren alten Tokens überschreiben oder bei SIGNED_OUT löschen.
  useEffect(() => {
    let browserAccessToken = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentToken = auth.getToken();
      if (event === 'INITIAL_SESSION') {
        browserAccessToken = session?.access_token || null;
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        if (loggedOut.current) return;
        const ownsSession = !currentToken || currentToken === browserAccessToken || currentToken === session.access_token;
        browserAccessToken = session.access_token;
        if (ownsSession) {
          auth.setToken(session.access_token);
          if (session.refresh_token) auth.setRefreshToken(session.refresh_token);
          // Ein SDK-Ereignis kann erst nach dem initialen App-Check eintreffen.
          // Das Profil dann außerhalb des SDK-Callbacks nachladen.
          void Promise.resolve().then(checkAppState);
        }
      } else if (event === 'SIGNED_OUT') {
        if (browserAccessToken && currentToken === browserAccessToken) {
          authCheckId.current++;
          auth.setToken(null);
          auth.setRefreshToken?.(null);
          auth.clearCachedUser?.();
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
        browserAccessToken = null;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Was ein Gast ohne Konto erfasst hat, gehört ab der Anmeldung ins Konto.
  // Fehlgeschlagene Datensätze bleiben lokal liegen und werden beim nächsten
  // Anmelden erneut versucht — deshalb scheitert die Anmeldung hier nie.
  const adoptGuestData = async () => {
    if (!hasGuestData()) return;
    try {
      await migrateGuestData(entities);
    } catch (error) {
      console.error('Übernahme der Gastdaten fehlgeschlagen:', error);
    }
  };

  const checkAppState = async () => {
    const checkId = ++authCheckId.current;
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
      loggedOut.current = false;

      // auth.me() liefert offline (Netzwerkfehler) das zwischengespeicherte
      // Profil zurück, sofern ein Token vorliegt — ein zuvor angemeldeter Nutzer
      // bleibt damit ohne Verbindung angemeldet.
      const currentUser = await auth.me();
      if (checkId !== authCheckId.current) return;
      setUser(currentUser);
      setIsAuthenticated(true);
      // Gastdatenübernahme kann mehrere API-Requests erfordern. Sie darf
      // den Auth-Ladeschirm (und damit alle Routen inkl. /Admin) nicht blockieren.
      // adoptGuestData behandelt Fehler selbst und bewahrt fehlgeschlagene
      // Datensätze für einen späteren Versuch auf.
      void adoptGuestData();
    } catch (error) {
      if (checkId !== authCheckId.current) return;
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
      if (checkId === authCheckId.current) setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    loggedOut.current = true;
    authCheckId.current++;
    setUser(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    auth.setToken(null);
    auth.setRefreshToken?.(null);
    auth.clearCachedUser?.();
    // Falls die Session ueber OAuth/Passwort-Reset lief, haelt der Browser-
    // Supabase-Client sonst eine eigene, persistierte Session am Leben, die
    // der onAuthStateChange-Listener oben nach dem Logout wieder als bb_token
    // zurueckschreiben wuerde. Auf signOut WARTEN (mit Zeitdeckel), sonst
    // bricht der sofortige Redirect den Request ab, bevor die lokale Session
    // geraeumt ist — der Logout wirkte dann nur bis zum naechsten Reload.
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch { /* Netzwerkfehler beim signOut blockiert den Logout nicht */ }
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

