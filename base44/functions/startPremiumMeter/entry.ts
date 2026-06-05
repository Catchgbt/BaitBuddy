import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Demo-User überspringen
    if (user.is_demo_user === true) {
      console.log(`⏭️ Demo user ${user.email} - skipping premium metering`);
      return Response.json({
        ok: true,
        message: 'Demo user - no metering',
        session_id: 'demo-' + Date.now(),
        is_demo: true
      });
    }

    const body = await req.json().catch(() => ({}));
    const { feature_id } = body;

    if (!feature_id) {
      return Response.json({ error: 'feature_id erforderlich' }, { status: 400 });
    }

    const userId = user.email;
    const MIN_CREDITS_REQUIRED = 200;

    // Wallet-Status prüfen
    let wallet = await base44.entities.PremiumWallet.filter({ user_id: userId }).then(results => results[0]);
    
    if (!wallet) {
      // Wallet erstellen falls nicht vorhanden
      const startingCredits = user.role === 'admin' ? 100000 : 10000;
      wallet = await base44.entities.PremiumWallet.create({
        user_id: userId,
        purchased_credits: startingCredits,
        consumed_credits: 0,
        total_spent_eur: 0
      });
      console.log(`✅ Created wallet for ${userId} with ${startingCredits} credits`);
    }

    const remainingCredits = wallet.purchased_credits - wallet.consumed_credits;

    if (remainingCredits < MIN_CREDITS_REQUIRED) {
      console.warn(`⚠️ Insufficient credits for ${userId}: ${remainingCredits} < ${MIN_CREDITS_REQUIRED}`);
      return Response.json({
        ok: false,
        error_type: 'insufficient_credits',
        message: `Mindestens ${MIN_CREDITS_REQUIRED} Credits benötigt`,
        credits_available: remainingCredits
      }, { status: 402 });
    }

    // Session erstellen
    const sessionId = `${userId}_${feature_id}_${Date.now()}`;
    const now = new Date().toISOString();

    await base44.entities.UsageSession.create({
      session_id: sessionId,
      user_id: userId,
      feature_id: feature_id,
      started_at: now,
      last_heartbeat: now,
      billed_credits: 0,
      status: 'active'
    });

    // Event protokollieren
    await base44.entities.PremiumEvent.create({
      user_id: userId,
      event_type: 'session_start',
      credits_amount: 0,
      payload: {
        session_id: sessionId,
        feature_id: feature_id,
        timestamp: now
      }
    });

    console.log(`✅ Session started: ${sessionId} for feature ${feature_id}`);

    return Response.json({
      ok: true,
      session_id: sessionId,
      feature_id: feature_id,
      remaining_credits: remainingCredits,
      started_at: now
    });

  } catch (error) {
    console.error('❌ Start Premium Meter Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});