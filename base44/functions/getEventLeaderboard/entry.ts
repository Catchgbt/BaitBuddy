import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all data server-side (no RLS restrictions)
    const [allSessions, allUsers, activeEvents] = await Promise.all([
      base44.asServiceRole.entities.UsageSession.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.AppEvent.filter({ is_active: true })
    ]);

    const activeEvent = activeEvents?.[0] || null;
    const eventStart = activeEvent ? new Date(activeEvent.start_date) : null;
    const eventEnd = activeEvent ? new Date(activeEvent.end_date) : null;
    const now = new Date();

    const calcSeconds = (session) => {
      const start = new Date(session.started_at);
      // Filter by event window if there is an active event
      if (eventStart && eventEnd) {
        if (start < eventStart || start > eventEnd) return 0;
      }
      if (session.status === 'stopped' && session.stopped_at) {
        return Math.max(0, Math.floor((new Date(session.stopped_at) - start) / 1000));
      } else if (session.status === 'active') {
        return Math.max(0, Math.floor((now - start) / 1000));
      }
      return 0;
    };

    // Aggregate time per user
    const userTimeMap = {};
    for (const session of allSessions) {
      if (session.feature_id !== 'app_general') continue;
      if (!userTimeMap[session.user_id]) userTimeMap[session.user_id] = 0;
      userTimeMap[session.user_id] += calcSeconds(session);
    }

    // Build leaderboard with user display data
    const userLookup = {};
    for (const u of allUsers) {
      userLookup[u.email] = u;
    }

    const leaderboard = Object.entries(userTimeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, totalSeconds], idx) => {
        const userData = userLookup[userId];
        return {
          rank: idx + 1,
          user_id: userId,
          display_name: userData?.full_name || userId.split('@')[0],
          profile_picture_url: userData?.profile_picture_url || null,
          total_seconds: totalSeconds
        };
      });

    return Response.json({
      leaderboard,
      event: activeEvent,
      calculated_at: now.toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});