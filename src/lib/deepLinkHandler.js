import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/api/supabaseClient';
import { api } from '@/api/frontendClient';

// Initialize deep-link listener at app startup (before Router renders)
export async function initializeDeepLinking() {
  if (typeof window === 'undefined') return;

  // Only on native platforms
  const isNative = window.Capacitor?.isNativePlatform?.() || window.capacitor?.platform;
  if (!isNative) return;

  try {
    if (!App?.addListener) return;

    // Handle deep-links that arrive while app is running
    const listener = await App.addListener('appUrlOpen', async (data) => {
      const url = data?.url;
      if (!url) return;

      console.log('[DeepLink] Received:', url);

      // Parse app://baitbuddy/auth/callback?code=...&state=... or #access_token=...
      if (url.includes('auth/callback')) {
        try {
          // Close the browser Custom Tab as promptly as possible
          await Browser.close().catch(() => {});

          const urlObj = new URL(url.replace('app://', 'https://'));
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');
          const errorDescription = urlObj.searchParams.get('error_description');

          if (error) {
            const message = errorDescription ? decodeURIComponent(errorDescription) : error;
            console.error('[DeepLink] OAuth error:', message);
            window.dispatchEvent(new CustomEvent('baitbuddy:oauth-error', { detail: { message } }));
            return;
          }

          if (!code) {
            console.warn('[DeepLink] No code or error in URL');
            return;
          }

          console.log('[DeepLink] Exchanging PKCE code...');
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[DeepLink] Code exchange failed:', exchangeError.message);
            window.dispatchEvent(new CustomEvent('baitbuddy:oauth-error', { detail: { message: exchangeError.message } }));
            return;
          }

          if (sessionData?.session?.access_token) {
            console.log('[DeepLink] Session acquired, syncing tokens...');
            api.setToken(sessionData.session.access_token);
            if (sessionData.session.refresh_token) {
              api.setRefreshToken(sessionData.session.refresh_token);
            }
            console.log('[DeepLink] Redirecting to Dashboard');
            window.location.replace('/Dashboard');
          }
        } catch (e) {
          console.error('[DeepLink] Processing error:', e);
          window.dispatchEvent(new CustomEvent('baitbuddy:oauth-error', { detail: { message: e.message } }));
        }
      }
    });

    return listener;
  } catch (error) {
    console.error('[DeepLink] Initialization error:', error);
  }
}
