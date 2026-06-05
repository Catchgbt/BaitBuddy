import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { competition_id } = await req.json();

    if (!competition_id) {
      return Response.json({ error: 'competition_id erforderlich' }, { status: 400 });
    }

    const clans = await base44.entities.Clan.filter({
      competition_id
    });

    const leaderboard = clans
      .sort((a, b) => (b.total_event_score || 0) - (a.total_event_score || 0))
      .map((clan, index) => ({
        rank: index + 1,
        clan_id: clan.id,
        clan_name: clan.name,
        total_score: clan.total_event_score || 0,
        total_catches: clan.total_catches || 0,
        average_size: clan.average_size || 0,
        member_count: clan.members?.length || 0
      }));

    const totalCatches = leaderboard.reduce((sum, c) => sum + c.total_catches, 0);
    const avgSize = leaderboard.reduce((sum, c) => sum + c.average_size, 0) / (leaderboard.length || 1);
    const mostActiveClan = leaderboard.length > 0 ? leaderboard[0].clan_name : 'N/A';

    return Response.json({ 
      success: true,
      leaderboard,
      winner: leaderboard[0] || null,
      statistics: {
        total_catches: totalCatches,
        average_size: Math.round(avgSize * 10) / 10,
        most_active_clan: mostActiveClan,
        total_clans: leaderboard.length
      }
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});