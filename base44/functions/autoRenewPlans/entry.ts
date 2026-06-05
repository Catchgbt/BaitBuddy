import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[autoRenewPlans] Starting automatic plan renewal check');

    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const now = new Date();
    let renewedCount = 0;
    let expiredCount = 0;
    const renewedUsers = [];
    const expiredUsers = [];

    for (const user of allUsers) {
      if (!user.premium_plan_id || user.premium_plan_id === 'free') {
        continue;
      }

      if (!user.premium_expires_at) {
        continue;
      }

      const expiresAt = new Date(user.premium_expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);

        await base44.asServiceRole.entities.User.update(user.id, {
          premium_expires_at: newExpiresAt.toISOString()
        });

        renewedCount++;
        renewedUsers.push({
          email: user.email,
          plan: user.premium_plan_id,
          old_expiry: user.premium_expires_at,
          new_expiry: newExpiresAt.toISOString()
        });

        console.log(`[autoRenewPlans] Renewed: ${user.email} - ${user.premium_plan_id}`);
      } else if (daysUntilExpiry <= 3) {
        console.log(`[autoRenewPlans] Expiring soon: ${user.email} - ${daysUntilExpiry} days remaining`);
        expiredCount++;
        expiredUsers.push({
          email: user.email,
          plan: user.premium_plan_id,
          days_remaining: daysUntilExpiry
        });
      }
    }

    console.log(`[autoRenewPlans] Completed - Renewed: ${renewedCount}, Expiring soon: ${expiredCount}`);

    return Response.json({
      ok: true,
      message: 'Auto-renewal check completed',
      renewed_count: renewedCount,
      expiring_soon_count: expiredCount,
      renewed_users: renewedUsers,
      expiring_users: expiredUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[autoRenewPlans] Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
});