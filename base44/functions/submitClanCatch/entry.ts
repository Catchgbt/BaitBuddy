import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catch_id, clan_id, competition_id } = await req.json();

    if (!catch_id || !clan_id || !competition_id) {
      return Response.json({ error: 'catch_id, clan_id und competition_id erforderlich' }, { status: 400 });
    }

    const clans = await base44.asServiceRole.entities.Clan.list('', 1000);
    const clan = clans.find(c => c.id === clan_id);

    if (!clan) {
      return Response.json({ error: 'Clan nicht gefunden' }, { status: 404 });
    }

    if (!clan.members.includes(user.email)) {
      return Response.json({ error: 'Du bist kein Mitglied dieses Clans' }, { status: 403 });
    }

    const catches = await base44.entities.Catch.list('', 1000);
    const targetCatch = catches.find(c => c.id === catch_id);

    if (!targetCatch) {
      return Response.json({ error: 'Fang nicht gefunden' }, { status: 404 });
    }

    if (targetCatch.created_by !== user.email) {
      return Response.json({ error: 'Nicht dein Fang' }, { status: 403 });
    }

    const existingClanCatches = await base44.entities.ClanCatch.filter({
      catch_id,
      competition_id
    });

    if (existingClanCatches.length > 0) {
      return Response.json({ error: 'Fang bereits fuer diesen Wettbewerb eingereicht' }, { status: 400 });
    }

    const length = targetCatch.length_cm || 0;
    let points = 0;
    
    if (length < 30) {
      points = 5;
    } else if (length >= 30 && length < 60) {
      points = 15;
    } else {
      points = 30;
    }

    await base44.entities.ClanCatch.create({
      catch_id,
      clan_id,
      user_id: user.email,
      competition_id,
      species: targetCatch.species,
      length_cm: length,
      points_earned: points,
      catch_time: targetCatch.catch_time,
      is_validated: true
    });

    const allClanCatches = await base44.asServiceRole.entities.ClanCatch.filter({
      clan_id,
      competition_id
    });

    const newTotalScore = allClanCatches.reduce((sum, c) => sum + (c.points_earned || 0), 0);
    const newTotalCatches = allClanCatches.length;
    const newAverageSize = allClanCatches.reduce((sum, c) => sum + (c.length_cm || 0), 0) / newTotalCatches;

    await base44.asServiceRole.entities.Clan.update(clan_id, {
      total_event_score: newTotalScore,
      total_catches: newTotalCatches,
      average_size: Math.round(newAverageSize * 10) / 10
    });

    return Response.json({ 
      success: true,
      points_earned: points,
      clan_total_score: newTotalScore,
      message: `Fang eingereicht! ${points} Punkte verdient`
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});