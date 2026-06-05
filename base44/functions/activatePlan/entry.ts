import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[activatePlan] No user authenticated');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[activatePlan] User:', user.email);

    const body = await req.json();
    const { plan_id, payment_method, transaction_id, purchase_token, product_id } = body;

    console.log('[activatePlan] Request:', { plan_id, payment_method, transaction_id, product_id });

    // Validiere Plan-ID (inkl. Friends-Pläne und Trial)
    const validPlans = ['free', 'basic', 'pro', 'ultimate', 'elite', 'friends', 'friends_monthly', 'trial_10_10'];
    if (!validPlans.includes(plan_id)) {
      console.error('[activatePlan] Invalid plan_id:', plan_id);
      return Response.json({
        ok: false,
        error: 'Ungültiger Plan'
      }, { status: 400 });
    }

    // Normalisiere elite -> ultimate, trial_10_10 -> ultimate (Voller Funktionsumfang)
    let normalizedPlan = plan_id;
    if (plan_id === 'elite') normalizedPlan = 'ultimate';
    if (plan_id === 'trial_10_10') normalizedPlan = 'ultimate';

    // Laufzeit bestimmen: friends = 1 Jahr, trial_10_10 = 10 Tage, alle anderen = 30 Tage
    let expiresAt = null;
    let durationDays = 0;
    if (normalizedPlan !== 'free') {
      const expires = new Date();
      if (plan_id === 'friends') {
        expires.setDate(expires.getDate() + 365);
        durationDays = 365;
      } else if (plan_id === 'trial_10_10') {
        expires.setDate(expires.getDate() + 10);
        durationDays = 10;
      } else {
        expires.setDate(expires.getDate() + 30);
        durationDays = 30;
      }
      expiresAt = expires.toISOString();
    }

    console.log('[activatePlan] Activating plan:', normalizedPlan, 'expires:', expiresAt);

    // Aktiviere Plan für den aktuellen User
    const updateData = {
      premium_plan_id: normalizedPlan,
      premium_expires_at: expiresAt
    };

    // Optional: Google Play Daten persistieren (falls Felder existieren)
    if (payment_method) updateData.premium_payment_method = payment_method;
    if (transaction_id) updateData.premium_transaction_id = transaction_id;
    if (purchase_token) updateData.premium_purchase_token = purchase_token;
    if (product_id) updateData.premium_product_id = product_id;

    console.log('[activatePlan] Updating user with:', updateData);

    await base44.auth.updateMe(updateData);

    console.log('[activatePlan] Plan activated successfully');

    return Response.json({
      ok: true,
      message: `${getPlanName(normalizedPlan)} Plan erfolgreich aktiviert!`,
      plan: {
        id: normalizedPlan,
        expires_at: expiresAt,
        duration_days: durationDays
      }
    });
  } catch (error) {
    console.error('[activatePlan] Error:', error);
    console.error('[activatePlan] Stack:', error.stack);
    return Response.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

function getPlanName(planId) {
  const names = {
    free: 'Kostenlos',
    basic: 'Basic',
    pro: 'Pro',
    ultimate: 'Ultimate',
    friends: 'Freundschaft (Jahr)',
    friends_monthly: 'Freundschaft (Monat)',
    trial_10_10: '10-Tage-Trial'
  };
  return names[planId] || 'Kostenlos';
}