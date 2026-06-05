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
      user_id: userId
    });

    if (sessions.length === 0) {
      console.log(`ℹ️ Session not found (might be already stopped): ${session_id}`);
      // Kein Fehler zurückgeben - Session könnte bereits gestoppt sein
      return Response.json({
        ok: true,
        message: 'Session bereits beendet oder nicht gefunden',
        session_id: session_id
      });
    }

    const session = sessions[0];

    // Prüfen ob Session bereits gestoppt ist
    if (session.status === 'stopped') {
      console.log(`ℹ️ Session already stopped: ${session_id}`);
      return Response.json({
        ok: true,
        message: 'Session bereits beendet',
        session_id: session_id
      });
    }

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const totalElapsedMinutes = (now - startedAt) / 1000 / 60;

    // Session als gestoppt markieren
    await base44.entities.UsageSession.update(session.id, {
      status: 'stopped',
      stopped_at: now.toISOString()
    });

    // Event protokollieren
    await base44.entities.PremiumEvent.create({
      user_id: userId,
      event_type: 'session_stop',
      credits_amount: 0,
      payload: {
        session_id: session_id,
        total_elapsed_minutes: totalElapsedMinutes,
        total_credits_billed: session.billed_credits
      }
    });

    console.log(`✅ Session stopped: ${session_id} - Duration: ${totalElapsedMinutes.toFixed(2)}min, Credits: ${session.billed_credits}`);

    return Response.json({
      ok: true,
      session_id: session_id,
      total_elapsed_minutes: totalElapsedMinutes,
      total_credits_billed: session.billed_credits
    });

  } catch (error) {
    console.error('❌ Stop Premium Meter Error:', error);
    // Bei Fehler trotzdem OK zurückgeben, damit die App nicht hängen bleibt
    return Response.json({ 
      ok: true,
      message: 'Session stop attempted (with errors)',
      error: error.message
    });
  }
});