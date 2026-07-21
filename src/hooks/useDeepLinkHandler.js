import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const setupDeepLinkListener = async () => {
      try {
        const { App } = await import('@capacitor/app');

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

        const unsubscribe = await App.addListener('appUrlOpen', handleDeepLink);

        return () => {
          unsubscribe?.remove?.();
        };
      } catch (error) {
        console.debug('[DeepLink] Not available (web environment)', error.message);
        return () => {};
      }
    };

    let cleanup;
    setupDeepLinkListener().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, [navigate]);
};
