// Punkte-Berechnung für Events
// Basiert auf komplexem Multiplikator-System mit Boni

// Punkte für verschiedene Aktivitäten
export const ACTIVITY_POINTS = {
  trip_completed: 50,
  ai_chat_interaction: 10,
  bait_mixer_use: 25,
  ai_analyze: 15,
  fishing_recommendation: 20,
  weather_check: 5,
  spot_analysis: 15,
  water_quality_check: 10,
  gear_logged: 15,
  fish_identified: 20,
  catch_logged: 30,
  photo_shared: 10,
  session_completed: 25,
};

export async function addActivityPoints(userId, eventId, activityType, supabase) {
  const points = ACTIVITY_POINTS[activityType] || 0;
  if (points === 0) return { ok: false, message: 'Unknown activity type' };

  try {
    const { data: submission, error: submissionError } = await supabase
      .from('event_submissions')
      .insert({
        event_id: eventId,
        user_id: userId,
        species: `[${activityType}]`,
        calculated_points: points,
        points_breakdown: { activity: activityType, base: points },
        verified: true,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    const { data: participant } = await supabase
      .from('event_participants')
      .select('total_points')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (participant) {
      const { count: submissionCount } = await supabase
        .from('event_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      await supabase
        .from('event_participants')
        .update({
          total_points: (parseFloat(participant.total_points) || 0) + points,
          submission_count: submissionCount || 0
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);
    }

    return { ok: true, points, activity: activityType };
  } catch (error) {
    console.error('Error adding activity points:', error);
    return { ok: false, error: error.message };
  }
}

export async function calculateSubmissionPoints(submission, eventId, supabase) {
  try {
    const { data: config, error: configError } = await supabase
      .from('event_point_configs')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Fehler beim Laden der Event-Konfiguration:', configError);
      return getDefaultPoints(submission);
    }

    if (!config) {
      return getDefaultPoints(submission);
    }

    const basePoints = config.base_points || 100;
    const lengthCm = parseFloat(submission.length_cm) || 0;
    const lengthBonus = lengthCm > 0 ? lengthCm * (config.length_bonus_per_cm || 5.0) : 0;
    const speciesBonus = config.species_bonus && submission.species
      ? parseFloat(config.species_bonus[submission.species]) || 0
      : 0;
    const communityLikes = parseInt(submission.community_likes) || 0;
    const likePointMultiplier = config.like_point_multiplier || 1.0;
    const likesPoints = communityLikes * likePointMultiplier;

    const totalPoints = basePoints + lengthBonus + speciesBonus + likesPoints;

    return {
      total: Math.round(totalPoints * 100) / 100,
      breakdown: {
        base: basePoints,
        length_bonus: Math.round(lengthBonus * 100) / 100,
        species_bonus: speciesBonus,
        likes_points: Math.round(likesPoints * 100) / 100
      }
    };
  } catch (error) {
    console.error('Fehler in calculateSubmissionPoints:', error);
    return getDefaultPoints(submission);
  }
}

function getDefaultPoints(submission) {
  const basePoints = 100;
  const lengthCm = parseFloat(submission.length_cm) || 0;
  const lengthBonus = lengthCm > 0 ? lengthCm * 5.0 : 0;
  const communityLikes = parseInt(submission.community_likes) || 0;
  const likesPoints = communityLikes * 1.0;

  const totalPoints = basePoints + lengthBonus + likesPoints;

  return {
    total: Math.round(totalPoints * 100) / 100,
    breakdown: {
      base: basePoints,
      length_bonus: Math.round(lengthBonus * 100) / 100,
      species_bonus: 0,
      likes_points: Math.round(likesPoints * 100) / 100
    }
  };
}

export function getPlacementBonus(rank, config) {
  if (rank === 1) return config?.first_place_bonus || 500;
  if (rank === 2) return config?.second_place_bonus || 300;
  if (rank === 3) return config?.third_place_bonus || 100;
  return 0;
}

export async function calculateEventFinalRankings(eventId, supabase) {
  try {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event nicht gefunden:', eventId);
      return [];
    }

    const { data: config } = await supabase
      .from('event_point_configs')
      .select('*')
      .eq('event_id', eventId)
      .single();

    const { data: submissions, error: submissionsError } = await supabase
      .from('event_submissions')
      .select('user_id, calculated_points')
      .eq('event_id', eventId)
      .order('calculated_points', { ascending: false });

    if (submissionsError) {
      console.error('Fehler beim Laden von Einreichungen:', submissionsError);
      return [];
    }

    const userScores = {};
    submissions.forEach(sub => {
      if (!userScores[sub.user_id]) {
        userScores[sub.user_id] = 0;
      }
      userScores[sub.user_id] += parseFloat(sub.calculated_points) || 0;
    });

    const rankings = Object.entries(userScores)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, totalPoints], index) => {
        const rank = index + 1;
        const placementBonus = getPlacementBonus(rank, config);
        const finalPoints = totalPoints + placementBonus;
        return {
          user_id: userId,
          rank,
          total_points: totalPoints,
          placement_bonus: placementBonus,
          final_points: finalPoints,
          is_winner: rank === 1
        };
      });

    for (const ranking of rankings) {
      await supabase
        .from('event_participants')
        .update({
          total_points: ranking.final_points,
          is_winner: ranking.is_winner
        })
        .eq('event_id', eventId)
        .eq('user_id', ranking.user_id);
    }

    return rankings;
  } catch (error) {
    console.error('Fehler in calculateEventFinalRankings:', error);
    return [];
  }
}

export async function aggregateMonthlyLeaderboard(year, month, supabase) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const { data: monthlyEvents, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ended')
      .gte('end_date', startDate.toISOString())
      .lt('end_date', endDate.toISOString());

    if (eventsError) {
      console.error('Fehler beim Laden von Events:', eventsError);
      return [];
    }

    const eventIds = monthlyEvents.map(e => e.id);
    if (eventIds.length === 0) {
      console.log(`Keine Events im ${month}/${year}`);
      return [];
    }

    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select('user_id, total_points')
      .in('event_id', eventIds);

    if (participantsError) {
      console.error('Fehler beim Laden von Teilnehmern:', participantsError);
      return [];
    }

    const userMonthlyPoints = {};
    const userEventCount = {};

    participants.forEach(p => {
      if (!userMonthlyPoints[p.user_id]) {
        userMonthlyPoints[p.user_id] = 0;
        userEventCount[p.user_id] = 0;
      }
      userMonthlyPoints[p.user_id] += parseFloat(p.total_points) || 0;
      userEventCount[p.user_id] += 1;
    });

    const leaderboard = Object.entries(userMonthlyPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, totalPoints], index) => ({
        year,
        month,
        user_id: userId,
        total_points: totalPoints,
        event_count: userEventCount[userId],
        rank: index + 1,
        reward_status: index === 0 ? 'pending' : 'not_eligible',
        expires_at: new Date(year + 1, month - 1, 1).toISOString()
      }));

    for (const entry of leaderboard) {
      if (entry.reward_status === 'not_eligible') {
        delete entry.reward_status;
        delete entry.expires_at;
      }

      const { error: upsertError } = await supabase
        .from('monthly_leaderboards')
        .upsert({
          ...entry
        }, { onConflict: 'year,month,user_id' });

      if (upsertError) {
        console.error('Fehler beim Speichern des Leaderboards:', upsertError);
      }
    }

    return leaderboard;
  } catch (error) {
    console.error('Fehler in aggregateMonthlyLeaderboard:', error);
    return [];
  }
}

export async function autoActivateRewards(year, month, supabase) {
  try {
    const { data: winners, error: winnersError } = await supabase
      .from('monthly_leaderboards')
      .select('id, user_id')
      .eq('year', year)
      .eq('month', month)
      .eq('rank', 1)
      .eq('reward_status', 'pending');

    if (winnersError) {
      console.error('Fehler beim Laden von Gewinnern:', winnersError);
      return [];
    }

    const activated = [];

    for (const winner of winners) {
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data: rewardActivation, error: rewardError } = await supabase
          .from('reward_activations')
          .upsert({
            user_id: winner.user_id,
            leaderboard_id: winner.id,
            plan_id: 'basic',
            duration_days: 30,
            expires_at: expiresAt.toISOString(),
            status: 'active'
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (rewardError) {
          console.error('Fehler beim Erstellen der Reward-Aktivierung:', rewardError);
          continue;
        }

        await supabase
          .from('monthly_leaderboards')
          .update({
            reward_status: 'claimed',
            claimed_at: new Date().toISOString()
          })
          .eq('id', winner.id);

        activated.push({
          user_id: winner.user_id,
          expires_at: expiresAt.toISOString()
        });
      } catch (error) {
        console.error(`Fehler bei Reward-Aktivierung für ${winner.user_id}:`, error);
      }
    }

    return activated;
  } catch (error) {
    console.error('Fehler in autoActivateRewards:', error);
    return [];
  }
}
