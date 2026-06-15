import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from "@/api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                                   = useState(null);
  const [isAuthenticated, setIsAuthenticated]             = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]                 = useState(true);
  const [isLoadingPublicSettings]                         = useState(false);
  const [authError, setAuthError]                         = useState(null);
  const [appPublicSettings]                               = useState(null);

  useEffect(() => { checkAppState(); }, []);

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
      // Only logout on auth failures (401/403), not on transient network errors
      if (error.status === 401 || error.status === 403) {
        console.warn('Auth token invalid, logging out');
        setIsAuthenticated(false);
        setUser(null);
        auth.setToken(null);
        auth.setRefreshToken?.(null);
      } else {
        // For network errors, 500, etc: keep current auth state and set error flag
        setAuthError(error.message);
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
