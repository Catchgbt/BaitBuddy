import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { target_user_email } = body;

    if (!target_user_email) {
      return Response.json({ error: 'target_user_email erforderlich' }, { status: 400 });
    }

    // Wallet des Ziel-Benutzers finden
    let wallet = await base44.asServiceRole.entities.PremiumWallet.filter({ 
      user_id: target_user_email 
    }).then(results => results[0]);

    if (!wallet) {
      return Response.json({ error: 'Wallet nicht gefunden' }, { status: 404 });
    }

    // Alle aktiven Sessions beenden
    const activeSessions = await base44.asServiceRole.entities.UsageSession.filter({
      user_id: target_user_email,
      status: 'active'
    });

    for (const session of activeSessions) {
      await base44.asServiceRole.entities.UsageSession.update(session.id, {
        status: 'stopped',
        stopped_at: new Date().toISOString()
      });
    }

    // Wallet zurücksetzen auf 10.000 Credits (Standard)
    wallet = await base44.asServiceRole.entities.PremiumWallet.update(wallet.id, {
      purchased_credits: 10000,
      consumed_credits: 0
    });

    // Admin-Event protokollieren
    await base44.asServiceRole.entities.PremiumEvent.create({
      user_id: target_user_email,
      event_type: 'purchase',
      credits_amount: 10000,
      payload: {
        admin_user: user.email,
        timestamp: new Date().toISOString(),
        action: 'reset_wallet',
        previous_purchased: wallet.purchased_credits,
        previous_consumed: wallet.consumed_credits,
        active_sessions_stopped: activeSessions.length
      }
    });

    console.log(`✅ Admin ${user.email} reset wallet for ${target_user_email}`);

    return Response.json({
      ok: true,
      message: `Wallet für ${target_user_email} wurde zurückgesetzt`,
      wallet: {
        user_id: target_user_email,
        purchased_credits: 10000,
        consumed_credits: 0,
        remaining_credits: 10000
      },
      sessions_stopped: activeSessions.length
    });

  } catch (error) {
    console.error('❌ Admin Reset Wallet Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});