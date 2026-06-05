import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { target_user_id, plan_id, duration_days } = body;

    if (!target_user_id || !plan_id) {
      return Response.json({ error: 'target_user_id und plan_id sind erforderlich' }, { status: 400 });
    }

    const validPlans = ['free', 'basic', 'pro', 'ultimate'];
    if (!validPlans.includes(plan_id)) {
      return Response.json({ error: 'Ungültiger Plan' }, { status: 400 });
    }

    let expiresAt = null;
    if (plan_id !== 'free') {
      const days = duration_days || 30;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      expiresAt = expires.toISOString();
    }

    await base44.asServiceRole.entities.User.update(target_user_id, {
      premium_plan_id: plan_id,
      premium_expires_at: expiresAt
    });

    console.log(`[adminAssignPlan] Admin ${user.email} assigned plan ${plan_id} to user ${target_user_id}`);

    return Response.json({
      ok: true,
      message: `Plan ${plan_id} erfolgreich zugewiesen`,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('[adminAssignPlan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});