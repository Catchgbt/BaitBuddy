// Global ref to store pending deep-link URL (set before Router context exists)
export const deepLinkStore = { url: null };

// Initialize deep-link listener at app startup (before Router renders)
export async function initializeDeepLinking() {
  if (typeof window === 'undefined') return;

  // Only on native platforms
  const isNative = window.Capacitor?.isNativePlatform?.() || window.capacitor?.platform;
  if (!isNative) return;

  try {
    const { App } = window.Capacitor;
    if (!App?.addListener) return;

    // Handle deep-links that arrive while app is running
    const listener = await App.addListener('appUrlOpen', (data) => {
      const url = data?.url;
      if (!url) return;

      console.log('[DeepLink] Received:', url);

      // Parse app://baitbuddy/auth/callback?code=...&state=...
      if (url.includes('auth/callback') || url.includes('auth')) {
        // Store the full URL with query params
        try {
          const urlObj = new URL(url.replace('app://', 'https://'));
          deepLinkStore.url = url; // Keep original for reference
          deepLinkStore.searchParams = urlObj.search; // Query params
          console.log('[DeepLink] Stored for navigation:', deepLinkStore.url);
        } catch (e) {
          console.error('[DeepLink] Parse error:', e);
        }
      }
    });

    return listener;
  } catch (error) {
    console.error('[DeepLink] Initialization error:', error);
  }
}
