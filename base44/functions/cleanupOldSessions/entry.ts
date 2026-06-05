import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;

    // Finde alle aktiven Sessions des Users
    const activeSessions = await base44.entities.UsageSession.filter({ 
      user_id: userId,
      status: 'active'
    });

    let cleanedCount = 0;

    // Stoppe alle aktiven Sessions
    for (const session of activeSessions) {
      try {
        await base44.entities.UsageSession.update(session.id, {
          status: 'stopped',
          stopped_at: new Date().toISOString()
        });
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to stop session ${session.id}:`, error);
      }
    }

    console.log(`✅ Cleaned up ${cleanedCount} old sessions for ${userId}`);

    return Response.json({
      ok: true,
      cleaned_sessions: cleanedCount,
      message: `${cleanedCount} alte Sessions bereinigt`
    });

  } catch (error) {
    console.error('❌ Cleanup Error:', error);
    return Response.json({ 
      ok: true, // Trotzdem OK zurückgeben, um die App nicht zu blockieren
      error: error.message,
      cleaned_sessions: 0
    });
  }
});