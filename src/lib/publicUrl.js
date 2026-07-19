// Liefert die öffentliche App-URL für Auth-Redirects (OAuth, Passwort-Reset).
// Wichtig: window.location.origin zeigt bei geschützten Vercel-Preview-Deployments
// auf eine URL, die nach dem Google-Login "You Need Access" erzwingt. Deshalb
// bevorzugen wir VITE_PUBLIC_URL (in .env.production auf die Live-Domain gesetzt).
export function getPublicAppUrl() {
  const envUrl = import.meta.env?.VITE_PUBLIC_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

export function buildPublicUrl(path = '/') {
  const base = getPublicAppUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
