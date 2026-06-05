import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { session_id } = body;

    if (!session_id) {
      return Response.json({ error: 'session_id erforderlich' }, { status: 400 });
    }

    // Demo-Session überspringen
    if (session_id.startsWith('demo-')) {
      return Response.json({
        ok: true,
        message: 'Demo session - no billing',
        is_demo: true
      });
    }

    const userId = user.email;

    // Session finden
    const sessions = await base44.entities.UsageSession.filter({ 
      session_id: session_id,
      user_id: userId,
      status: 'active'
    });

    if (sessions.length === 0) {
      console.warn(`⚠️ Session not found or already stopped: ${session_id}`);
      return Response.json({
        ok: false,
        error_type: 'session_not_found',
        message: 'Session nicht gefunden oder bereits beendet'
      }, { status: 404 });
    }

    const session = sessions[0];
    const now = new Date();
    const startedAt = new Date(session.started_at);
    const elapsedMinutes = (now - startedAt) / 1000 / 60;

    // Credits pro Minute: 200
    const CREDITS_PER_MINUTE = 200;
    const totalCreditsRequired = Math.ceil(elapsedMinutes * CREDITS_PER_MINUTE);
    const newCreditsBilled = totalCreditsRequired - session.billed_credits;

    // Wallet aktualisieren
    const wallet = await base44.entities.PremiumWallet.filter({ user_id: userId }).then(results => results[0]);
    
    if (!wallet) {
      return Response.json({
        ok: false,
        error: 'Wallet nicht gefunden'
      }, { status: 500 });
    }

    const remainingCredits = wallet.purchased_credits - wallet.consumed_credits;

    if (remainingCredits < newCreditsBilled) {
      console.warn(`⚠️ Insufficient credits during heartbeat for ${userId}`);
      
      // Session automatisch beenden
      await base44.entities.UsageSession.update(session.id, {
        status: 'stopped',
        stopped_at: now.toISOString()
      });

      return Response.json({
        ok: false,
        error_type: 'insufficient_credits',
        message: 'Credits aufgebraucht',
        remaining_credits: remainingCredits
      }, { status: 402 });
    }

    // Consumed Credits aktualisieren
    await base44.entities.PremiumWallet.update(wallet.id, {
      consumed_credits: wallet.consumed_credits + newCreditsBilled
    });

    // Session aktualisieren
    await base44.entities.UsageSession.update(session.id, {
      last_heartbeat: now.toISOString(),
      billed_credits: totalCreditsRequired
    });

    // Event protokollieren
    if (newCreditsBilled > 0) {
      await base44.entities.PremiumEvent.create({
        user_id: userId,
        event_type: 'heartbeat',
        credits_amount: -newCreditsBilled,
        payload: {
          session_id: session_id,
          elapsed_minutes: elapsedMinutes,
          total_credits_billed: totalCreditsRequired
        }
      });
    }

    console.log(`💓 Heartbeat for ${session_id}: ${elapsedMinutes.toFixed(2)}min, ${totalCreditsRequired} credits`);

    return Response.json({
      ok: true,
      elapsed_minutes: elapsedMinutes,
      total_credits_billed: totalCreditsRequired,
      new_credits_billed: newCreditsBilled,
      remaining_credits: remainingCredits - newCreditsBilled
    });

  } catch (error) {
    console.error('❌ Heartbeat Premium Meter Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
});