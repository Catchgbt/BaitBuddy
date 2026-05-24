import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── POST /api/createClan ──────────────────────────────────────────────────
router.post('/createClan', requireAuth, async (req, res) => {
  try {
    const { name, description, competition_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Clanname erforderlich' });

    const { data: clan, error } = await supabase.from('clans').insert({
      name, description: description || '', members: [req.user.email],
      founder_email: req.user.email, competition_id: competition_id || null,
      total_event_score: 0, total_catches: 0, average_size: 0
    }).select().single();

    if (error) throw error;
    return res.json({ success: true, clan, message: 'Clan erfolgreich erstellt' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/joinClan ────────────────────────────────────────────────────
router.post('/joinClan', requireAuth, async (req, res) => {
  try {
    const { clan_id } = req.body;
    if (!clan_id) return res.status(400).json({ error: 'clan_id erforderlich' });

    const { data: clan } = await supabase.from('clans').select('*').eq('id', clan_id).single();
    if (!clan) return res.status(404).json({ error: 'Clan nicht gefunden' });
    if (clan.members.includes(req.user.email)) return res.status(400).json({ error: 'Du bist bereits Mitglied' });
    if (clan.members.length >= 10) return res.status(400).json({ error: 'Clan ist voll (max 10 Mitglieder)' });

    await supabase.from('clans').update({ members: [...clan.members, req.user.email] }).eq('id', clan_id);
    return res.json({ success: true, message: 'Erfolgreich beigetreten' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getClanLeaderboard ──────────────────────────────────────────
router.post('/getClanLeaderboard', requireAuth, async (req, res) => {
  try {
    const { competition_id } = req.body;
    if (!competition_id) return res.status(400).json({ error: 'competition_id erforderlich' });

    const { data: clans } = await supabase.from('clans').select('*').eq('competition_id', competition_id);
    const leaderboard = (clans || []).sort((a, b) => (b.total_event_score || 0) - (a.total_event_score || 0)).map((clan, index) => ({
      rank: index + 1, clan_id: clan.id, clan_name: clan.name,
      total_score: clan.total_event_score || 0, total_catches: clan.total_catches || 0,
      average_size: clan.average_size || 0, member_count: clan.members?.length || 0
    }));

    const totalCatches = leaderboard.reduce((sum, c) => sum + c.total_catches, 0);
    const avgSize = leaderboard.length ? leaderboard.reduce((sum, c) => sum + c.average_size, 0) / leaderboard.length : 0;

    return res.json({ success: true, leaderboard, winner: leaderboard[0] || null, statistics: { total_catches: totalCatches, average_size: Math.round(avgSize * 10) / 10, most_active_clan: leaderboard[0]?.clan_name || 'N/A', total_clans: leaderboard.length } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getVotingLeaderboard ────────────────────────────────────────
router.post('/getVotingLeaderboard', requireAuth, async (req, res) => {
  try {
    const { competition_id } = req.body;
    if (!competition_id) return res.status(400).json({ error: 'competition_id erforderlich' });

    const { data: submissions } = await supabase.from('voting_submissions').select('*').eq('competition_id', competition_id);
    const valid = (submissions || []).filter(s => !s.is_suspicious);
    const leaderboard = valid.sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).map((s, index) => ({
      rank: index + 1, user_id: s.user_id, species: s.species, length_cm: s.length_cm,
      photo_url: s.photo_url, community_likes: s.community_likes || 0, ai_score: s.ai_score || 0,
      total_score: s.total_score || 0, submission_id: s.id
    }));

    const disqualified = (submissions || []).filter(s => s.is_suspicious).map(s => ({ user_id: s.user_id, reason: s.disqualification_reason || 'Verdächtige Aktivität' }));

    return res.json({ success: true, leaderboard, disqualified, total_submissions: (submissions || []).length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/addVotingLike ───────────────────────────────────────────────
router.post('/addVotingLike', requireAuth, async (req, res) => {
  try {
    const { submission_id, competition_id } = req.body;
    if (!submission_id || !competition_id) return res.status(400).json({ error: 'submission_id und competition_id erforderlich' });

    const { data: existing } = await supabase.from('voting_likes').select('id').eq('submission_id', submission_id).eq('user_id', req.user.email);
    if (existing?.length) return res.status(400).json({ error: 'Du hast bereits geliked' });

    await supabase.from('voting_likes').insert({ submission_id, user_id: req.user.email, competition_id });

    const { data: submission } = await supabase.from('voting_submissions').select('*').eq('id', submission_id).single();
    if (submission) {
      const newLikesCount = (submission.community_likes || 0) + 1;
      const total_score = (newLikesCount * 0.7) + ((submission.ai_score || 0) * 0.3);
      await supabase.from('voting_submissions').update({ community_likes: newLikesCount, total_score: Math.round(total_score) }).eq('id', submission_id);
    }

    return res.json({ success: true, message: 'Like erfolgreich' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/startCommunityCompetition ───────────────────────────────────
router.post('/startCommunityCompetition', requireAuth, async (req, res) => {
  try {
    const { template_id } = req.body;
    const TEMPLATES = {
      biggest_pike_week: { title: 'Größter Hecht der Woche', description: 'Wer fängt diese Woche den größten Hecht?', competition_type: 'specific_species', target_species: 'Hecht', duration_days: 7, prize: 'Ruhm und Ehre' },
      biggest_carp_month: { title: 'Größter Karpfen des Monats', description: 'Wer hat den dicksten Karpfen?', competition_type: 'specific_species', target_species: 'Karpfen', duration_days: 30, prize: 'Community-Champion-Titel' },
      most_catches_week: { title: 'Fängiger Angler der Woche', description: 'Wer fängt die meisten Fische?', competition_type: 'most_catches', duration_days: 7, prize: 'Top-Angler-Badge' },
      biggest_catch_week: { title: 'Größter Fang der Woche', description: 'Der längste Fisch gewinnt.', competition_type: 'biggest_catch', duration_days: 7, prize: 'Community-Trophäe' },
      photo_contest_week: { title: 'Foto-Wettbewerb der Woche', description: 'Reiche dein bestes Fangfoto ein.', competition_type: 'photo_contest', duration_days: 7, prize: 'Foto-des-Monats-Badge' },
      zander_night_week: { title: 'Zander-Nights', description: 'Eine Woche lang Zander-Action.', competition_type: 'specific_species', target_species: 'Zander', duration_days: 7, prize: 'Zander-King-Titel' }
    };

    const tpl = TEMPLATES[template_id];
    if (!tpl) return res.status(400).json({ error: 'Unbekannte Vorlage' });

    const start = new Date();
    const end = new Date(start.getTime() + tpl.duration_days * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase.from('competitions').select('*').eq('title', tpl.title).eq('is_active', true);
    const stillRunning = existing?.find(c => new Date(c.end_date) > new Date());

    if (stillRunning) {
      const updatedParticipants = Array.from(new Set([...(stillRunning.participants || []), req.user.email]));
      await supabase.from('competitions').update({ participants: updatedParticipants }).eq('id', stillRunning.id);
      return res.json({ competition: { ...stillRunning, participants: updatedParticipants }, joined: true });
    }

    const { data: competition } = await supabase.from('competitions').insert({
      title: tpl.title, description: tpl.description, competition_type: tpl.competition_type,
      target_species: tpl.target_species || null, start_date: start.toISOString(), end_date: end.toISOString(),
      prize: tpl.prize, is_active: true, participants: [req.user.email], submissions: []
    }).select().single();

    return res.json({ competition, created: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/submitClanCatch ─────────────────────────────────────────────
router.post('/submitClanCatch', requireAuth, async (req, res) => {
  try {
    const { catch_id, clan_id, competition_id } = req.body;
    if (!catch_id || !clan_id || !competition_id) return res.status(400).json({ error: 'catch_id, clan_id und competition_id erforderlich' });

    const { data: clan } = await supabase.from('clans').select('*').eq('id', clan_id).single();
    if (!clan) return res.status(404).json({ error: 'Clan nicht gefunden' });
    if (!clan.members.includes(req.user.email)) return res.status(403).json({ error: 'Du bist kein Mitglied dieses Clans' });

    const { data: targetCatch } = await supabase.from('catches').select('*').eq('id', catch_id).single();
    if (!targetCatch) return res.status(404).json({ error: 'Fang nicht gefunden' });
    if (targetCatch.created_by !== req.user.email) return res.status(403).json({ error: 'Nicht dein Fang' });

    const { data: existing } = await supabase.from('clan_catches').select('id').eq('catch_id', catch_id).eq('competition_id', competition_id);
    if (existing?.length) return res.status(400).json({ error: 'Fang bereits für diesen Wettbewerb eingereicht' });

    const length = targetCatch.length_cm || 0;
    const points = length < 30 ? 5 : length < 60 ? 15 : 30;

    await supabase.from('clan_catches').insert({ catch_id, clan_id, user_id: req.user.email, competition_id, species: targetCatch.species, length_cm: length, points_earned: points, catch_time: targetCatch.catch_time, is_validated: true });

    const { data: allClanCatches } = await supabase.from('clan_catches').select('*').eq('clan_id', clan_id).eq('competition_id', competition_id);
    const newTotalScore = (allClanCatches || []).reduce((sum, c) => sum + (c.points_earned || 0), 0);
    const newTotalCatches = (allClanCatches || []).length;
    const newAverageSize = newTotalCatches ? (allClanCatches || []).reduce((sum, c) => sum + (c.length_cm || 0), 0) / newTotalCatches : 0;

    await supabase.from('clans').update({ total_event_score: newTotalScore, total_catches: newTotalCatches, average_size: Math.round(newAverageSize * 10) / 10 }).eq('id', clan_id);

    return res.json({ success: true, points_earned: points, clan_total_score: newTotalScore, message: `Fang eingereicht! ${points} Punkte verdient` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/submitVotingCatch ───────────────────────────────────────────
router.post('/submitVotingCatch', requireAuth, async (req, res) => {
  try {
    const { catch_id, competition_id } = req.body;
    if (!catch_id || !competition_id) return res.status(400).json({ error: 'catch_id und competition_id erforderlich' });

    const { data: targetCatch } = await supabase.from('catches').select('*').eq('id', catch_id).single();
    if (!targetCatch) return res.status(404).json({ error: 'Fang nicht gefunden' });
    if (targetCatch.created_by !== req.user.email) return res.status(403).json({ error: 'Nicht dein Fang' });

    const { data: existing } = await supabase.from('voting_submissions').select('id').eq('catch_id', catch_id).eq('competition_id', competition_id);
    if (existing?.length) return res.status(400).json({ error: 'Fang bereits eingereicht' });

    const { data: submission } = await supabase.from('voting_submissions').insert({ competition_id, catch_id, user_id: req.user.email, photo_url: targetCatch.photo_url, species: targetCatch.species, length_cm: targetCatch.length_cm || 0, catch_time: targetCatch.catch_time, community_likes: 0, ai_score: 0, total_score: 0, is_suspicious: false }).select().single();

    return res.json({ success: true, submission, message: 'Fang erfolgreich eingereicht' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getEventLeaderboard ─────────────────────────────────────────
router.post('/getEventLeaderboard', requireAuth, async (req, res) => {
  try {
    const [{ data: allSessions }, { data: allUsers }, { data: activeEvents }] = await Promise.all([
      supabase.from('usage_sessions').select('*'),
      supabase.from('users_public').select('*'),
      supabase.from('app_events').select('*').eq('is_active', true)
    ]);

    const activeEvent = activeEvents?.[0] || null;
    const eventStart = activeEvent ? new Date(activeEvent.start_date) : null;
    const eventEnd = activeEvent ? new Date(activeEvent.end_date) : null;
    const now = new Date();

    const userTimeMap = {};
    for (const session of allSessions || []) {
      if (session.feature_id !== 'app_general') continue;
      const start = new Date(session.started_at);
      if (eventStart && eventEnd && (start < eventStart || start > eventEnd)) continue;
      let seconds = 0;
      if (session.status === 'stopped' && session.stopped_at) {
        seconds = Math.max(0, Math.floor((new Date(session.stopped_at) - start) / 1000));
      } else if (session.status === 'active') {
        seconds = Math.max(0, Math.floor((now - start) / 1000));
      }
      userTimeMap[session.user_id] = (userTimeMap[session.user_id] || 0) + seconds;
    }

    const userLookup = {};
    for (const u of allUsers || []) userLookup[u.email] = u;

    const leaderboard = Object.entries(userTimeMap).sort((a, b) => b[1] - a[1]).map(([userId, totalSeconds], idx) => {
      const userData = userLookup[userId];
      return { rank: idx + 1, user_id: userId, display_name: userData?.full_name || userId.split('@')[0], profile_picture_url: userData?.profile_picture_url || null, total_seconds: totalSeconds };
    });

    return res.json({ leaderboard, event: activeEvent, calculated_at: now.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
