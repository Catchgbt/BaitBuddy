import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

let CapacitorApp;
try {
  CapacitorApp = require('@capacitor/app').App;
} catch (e) {
  CapacitorApp = null;
}

export const useDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!CapacitorApp) return;

    const handleDeepLink = async (data) => {
      const url = data.url;
      console.log('[DeepLink] Opened:', url);

      try {
        const appUrlString = url.split('://')[1];
        if (!appUrlString) return;

        const [, ...pathParts] = appUrlString.split('/');
        const pathWithQuery = pathParts.join('/');
        const [pathname, queryString] = pathWithQuery.split('?');

        if (pathname === 'auth' || pathname === 'auth/callback') {
          const redirectPath = queryString ? `/AuthCallback?${queryString}` : '/AuthCallback';
          console.log('[DeepLink] Navigating to:', redirectPath);
          navigate(redirectPath);
        } else if (pathname === 'logbook') {
          navigate('/Logbook');
        } else if (pathname === 'dashboard') {
          navigate('/Dashboard');
        }
      } catch (error) {
        console.error('[DeepLink] Parse error:', error);
      }
    };

    const unsubscribe = CapacitorApp.addListener('appUrlOpen', handleDeepLink);

    return () => {
      unsubscribe.then((listener) => listener?.remove?.());
    };
  }, [navigate]);
};
