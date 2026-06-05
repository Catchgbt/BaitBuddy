import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simuliere Backend-Status basierend auf User-Daten
    const userSettings = user.settings || {};
    const premiumUntil = user.premium_until ? new Date(user.premium_until) : null;
    const now = new Date();
    const isPremiumActive = premiumUntil && premiumUntil > now;
    const accountAge = user.created_date ? Math.floor((now - new Date(user.created_date)) / (1000 * 60 * 60 * 24)) : 0;
    
    return Response.json({
      kibuddy_credits: user.credits || 0,
      premium_minutes_left: isPremiumActive ? Math.floor((premiumUntil - now) / (1000 * 60)) : 0,
      account_age_days: accountAge,
      ads_enabled: accountAge >= 3 && !isPremiumActive,
      premium_active: isPremiumActive
    });
  } catch (error) {
    console.error('Premium Status Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});