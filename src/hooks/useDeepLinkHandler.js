import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDeepLink = (data) => {
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

    let unsubscribe;
    if (typeof window !== 'undefined' && window.Capacitor) {
      try {
        const { App } = window.Capacitor;
        if (App && App.addListener) {
          App.addListener('appUrlOpen', handleDeepLink).then((listener) => {
            unsubscribe = listener;
          });
        }
      } catch (error) {
        console.debug('[DeepLink] Setup failed:', error.message);
      }
    }

    return () => {
      unsubscribe?.remove?.();
    };
  }, [navigate]);
};
