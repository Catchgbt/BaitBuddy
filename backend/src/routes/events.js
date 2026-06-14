import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import {
  calculateSubmissionPoints,
  calculateEventFinalRankings,
  aggregateMonthlyLeaderboard,
  autoActivateRewards,
  addActivityPoints,
  ACTIVITY_POINTS
} from '../lib/pointsCalculator.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/events/templates', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Templates' });
  }
});

router.get('/events/templates/:templateId', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_templates')
      .select('*')
      .eq('template_id', req.params.templateId)
      .single();

    if (error) return res.status(404).json({ error: 'Template nicht gefunden' });
    return res.json(data);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Templates' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/events', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Events' });
  }
});

router.get('/events/:id', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Event nicht gefunden' });
    return res.json(data);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Events' });
  }
});

router.post('/events', requireAuth, async (req, res) => {
  try {
    const { name, description, start_date, end_date, template_id, scoring_method, target_species, prize_description } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, Startdatum und Enddatum erforderlich' });
    }

    // 1. Event erstellen
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name,
        description: description || '',
        start_date,
        end_date,
        created_by: req.user.email,
        template_id: template_id || null,
        event_type: template_id ? 'template' : 'custom',
        scoring_method: scoring_method || 'points',
        target_species: target_species || null,
        prize_description: prize_description || null,
        status: 'active',
        is_active: true
      })
      .select()
      .single();

    if (eventError) return res.status(500).json({ error: eventError.message });

    // 2. Creator als Teilnehmer hinzufügen
    await supabase
      .from('event_participants')
      .insert({
        event_id: event.id,
        user_id: req.user.email,
        joined_at: new Date().toISOString()
      });

    // 3. Standard-Punkte-Konfiguration erstellen
    const { data: template } = await supabase
      .from('event_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    const config = {
      event_id: event.id,
      base_points: template?.base_points || 100,
      length_bonus_per_cm: template?.base_points ? 5.0 : 5.0,
      species_bonus: template?.target_species ? { [template.target_species]: 50 } : {},
      first_place_bonus: 500,
      second_place_bonus: 300,
      third_place_bonus: 100,
      like_point_multiplier: 1.0
    };

    await supabase
      .from('event_point_configs')
      .insert(config);

    return res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Events' });
  }
});

router.patch('/events/:id', requireAuth, async (req, res) => {
  try {
    // Prüfe Ownership
    const { data: event } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', req.params.id)
      .single();

    if (!event || event.created_by !== req.user.email) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const { data, error } = await supabase
      .from('events')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Events' });
  }
});

router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    const { data: event } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', req.params.id)
      .single();

    if (!event || event.created_by !== req.user.email) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await supabase
      .from('events')
      .update({ is_active: false })
      .eq('id', req.params.id);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Events' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT PARTICIPATION
// ─────────────────────────────────────────────────────────────────────────────

router.post('/events/:id/join', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('event_participants')
      .insert({
        event_id: req.params.id,
        user_id: req.user.email,
        joined_at: new Date().toISOString()
      });

    if (error?.code === '23505') {
      return res.json({ ok: true, already_joined: true });
    }
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Fehler beim Beitreten des Events' });
  }
});

router.post('/events/:id/leave', requireAuth, async (req, res) => {
  try {
    await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', req.params.id)
      .eq('user_id', req.user.email);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ error: 'Fehler beim Verlassen des Events' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SUBMISSIONS & LEADERBOARDS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/events/:id/submit', requireAuth, async (req, res) => {
  try {
    const { species, length_cm, weight_kg, photo_url, catch_time } = req.body;

    // 1. Berechne Punkte
    const pointsResult = await calculateSubmissionPoints(
      { species, length_cm, community_likes: 0 },
      req.params.id,
      supabase
    );

    // 2. Erstelle Einreichung
    const { data: submission, error: submissionError } = await supabase
      .from('event_submissions')
      .insert({
        event_id: req.params.id,
        user_id: req.user.email,
        species,
        length_cm: parseFloat(length_cm) || null,
        weight_kg: parseFloat(weight_kg) || null,
        photo_url: photo_url || null,
        catch_time: catch_time || new Date().toISOString(),
        calculated_points: pointsResult.total,
        points_breakdown: pointsResult.breakdown,
        verified: true
      })
      .select()
      .single();

    if (submissionError) return res.status(500).json({ error: submissionError.message });

    // 3. Aktualisiere event_participants totale Punkte
    const { data: participant } = await supabase
      .from('event_participants')
      .select('total_points, submission_count')
      .eq('event_id', req.params.id)
      .eq('user_id', req.user.email)
      .single();

    if (participant) {
      await supabase
        .from('event_participants')
        .update({
          total_points: (parseFloat(participant.total_points) || 0) + pointsResult.total,
          submission_count: (participant.submission_count || 0) + 1
        })
        .eq('event_id', req.params.id)
        .eq('user_id', req.user.email);
    }

    return res.status(201).json(submission);
  } catch (error) {
    console.error('Error submitting event entry:', error);
    res.status(500).json({ error: 'Fehler beim Einreichen der Einreichung' });
  }
});

router.get('/events/:id/participants', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', req.params.id)
      .order('total_points', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Teilnehmer' });
  }
});

router.get('/events/:id/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', req.params.id)
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Leaderboards' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT INVITATIONS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/events/:id/invite', requireAuth, async (req, res) => {
  try {
    const { invitee_emails } = req.body;

    if (!Array.isArray(invitee_emails) || invitee_emails.length === 0) {
      return res.status(400).json({ error: 'invitee_emails erforderlich' });
    }

    const invitations = await Promise.all(
      invitee_emails.map(email =>
        supabase
          .from('event_invitations')
          .insert({
            event_id: req.params.id,
            inviter_id: req.user.email,
            invitee_id: email,
            status: 'pending'
          })
          .select()
          .single()
          .catch(err => ({ error: err }))
      )
    );

    return res.status(201).json({ invitations: invitations.filter(i => !i.error) });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: 'Fehler beim Senden von Einladungen' });
  }
});

router.get('/events/invitations/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_invitations')
      .select('*, events(*)')
      .eq('invitee_id', req.user.email)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Fehler beim Laden von Einladungen' });
  }
});

router.post('/events/invitations/:id/accept', requireAuth, async (req, res) => {
  try {
    // 1. Aktualisiere Einladungs-Status
    const { error: inviteError } = await supabase
      .from('event_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('invitee_id', req.user.email);

    if (inviteError) return res.status(500).json({ error: inviteError.message });

    // 2. Hole Event-ID
    const { data: invitation } = await supabase
      .from('event_invitations')
      .select('event_id')
      .eq('id', req.params.id)
      .single();

    // 3. Füge User als Teilnehmer hinzu
    if (invitation) {
      await supabase
        .from('event_participants')
        .insert({
          event_id: invitation.event_id,
          user_id: req.user.email
        });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Fehler beim Akzeptieren der Einladung' });
  }
});

router.post('/events/invitations/:id/decline', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('event_invitations')
      .update({ status: 'declined' })
      .eq('id', req.params.id)
      .eq('invitee_id', req.user.email);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ error: 'Fehler beim Ablehnen der Einladung' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY LEADERBOARDS & REWARDS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/leaderboards/monthly', optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    const { data, error } = await supabase
      .from('monthly_leaderboards')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('rank', { ascending: true })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error);
    res.status(500).json({ error: 'Fehler beim Laden des monatlichen Leaderboards' });
  }
});

router.get('/rewards/my-activations', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reward_activations')
      .select('*')
      .eq('user_id', req.user.email)
      .eq('status', 'active');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching reward activations:', error);
    res.status(500).json({ error: 'Fehler beim Laden der aktivierten Rewards' });
  }
});

router.post('/rewards/claim', requireAuth, async (req, res) => {
  try {
    const { leaderboard_id } = req.body;

    if (!leaderboard_id) {
      return res.status(400).json({ error: 'leaderboard_id erforderlich' });
    }

    // Prüfe ob User der Gewinner ist
    const { data: leaderboard } = await supabase
      .from('monthly_leaderboards')
      .select('*')
      .eq('id', leaderboard_id)
      .eq('user_id', req.user.email)
      .eq('rank', 1)
      .single();

    if (!leaderboard) {
      return res.status(403).json({ error: 'Keine Berechtigung für diesen Reward' });
    }

    // Reward wurde bereits automatisch aktiviert
    const { data: activation, error } = await supabase
      .from('reward_activations')
      .select('*')
      .eq('user_id', req.user.email)
      .eq('leaderboard_id', leaderboard_id)
      .single();

    if (error || !activation) {
      return res.status(400).json({ error: 'Reward nicht verfügbar' });
    }

    return res.json(activation);
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ error: 'Fehler beim Beanspruchen des Rewards' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (Cron Jobs)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admin/leaderboards/monthly/generate', async (req, res) => {
  try {
    // Vercel Crons senden Authorization: Bearer <CRON_SECRET> Header
    const secret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
    if (!secret) {
      return res.status(500).json({ error: 'Cron-Secret nicht konfiguriert' });
    }
    const authHeader = req.headers.authorization || '';
    const headerSecret = authHeader.replace(/^Bearer\s+/, '').trim();
    const xApiKey = req.headers['x-api-key'] || '';

    const isAuthorized = headerSecret === secret || xApiKey === secret;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    const result = await aggregateMonthlyLeaderboard(year, month, supabase);

    return res.json({
      success: true,
      year,
      month,
      entries: result.length,
      leaderboard: result
    });
  } catch (error) {
    console.error('Error generating monthly leaderboard:', error);
    res.status(500).json({ error: 'Fehler beim Generieren des monatlichen Leaderboards' });
  }
});

router.get('/admin/rewards/auto-activate', async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
    if (!secret) {
      return res.status(500).json({ error: 'Cron-Secret nicht konfiguriert' });
    }
    const authHeader = req.headers.authorization || '';
    const headerSecret = authHeader.replace(/^Bearer\s+/, '').trim();
    const xApiKey = req.headers['x-api-key'] || '';

    const isAuthorized = headerSecret === secret || xApiKey === secret;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const activated = await autoActivateRewards(year, month, supabase);

    return res.json({
      success: true,
      activated_count: activated.length,
      activations: activated
    });
  } catch (error) {
    console.error('Error auto-activating rewards:', error);
    res.status(500).json({ error: 'Fehler beim automatischen Aktivieren von Rewards' });
  }
});

router.get('/admin/events/auto-archive', async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
    if (!secret) {
      return res.status(500).json({ error: 'Cron-Secret nicht konfiguriert' });
    }
    const authHeader = req.headers.authorization || '';
    const headerSecret = authHeader.replace(/^Bearer\s+/, '').trim();
    const xApiKey = req.headers['x-api-key'] || '';

    const isAuthorized = headerSecret === secret || xApiKey === secret;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const now = new Date();

    // Finde alle abgelaufenen Events
    const { data: expiredEvents, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', now.toISOString());

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    let archived = 0;

    for (const event of expiredEvents) {
      // Berechne finale Rankings
      await calculateEventFinalRankings(event.id, supabase);

      // Markiere als ended
      await supabase
        .from('events')
        .update({ status: 'ended' })
        .eq('id', event.id);

      archived++;
    }

    return res.json({
      success: true,
      archived_count: archived
    });
  } catch (error) {
    console.error('Error archiving events:', error);
    res.status(500).json({ error: 'Fehler beim Archivieren von Events' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY COMPETITION INTEGRATION (aus community.js)
// ─────────────────────────────────────────────────────────────────────────────

// Starte einen Wettbewerb aus vordefinierten Templates
router.post('/community/competitions/start', requireAuth, async (req, res) => {
  try {
    const { template_id } = req.body;

    if (!template_id) {
      return res.status(400).json({ error: 'template_id erforderlich' });
    }

    // Lade Template
    const { data: template, error: templateError } = await supabase
      .from('event_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template nicht gefunden' });
    }

    // Prüfe ob Event mit diesem Template schon existiert
    const now = new Date();
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('template_id', template_id)
      .eq('status', 'active')
      .gte('end_date', now.toISOString())
      .single();

    if (existing) {
      // Füge User als Teilnehmer hinzu
      await supabase
        .from('event_participants')
        .insert({
          event_id: existing.id,
          user_id: req.user.email
        });

      return res.json({ ok: true, joined: true, event_id: existing.id });
    }

    // Erstelle neues Event aus Template
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (template.duration_days || 14));

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        template_id: template_id,
        name: template.name,
        description: template.description,
        event_type: 'template',
        created_by: req.user.email,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        target_species: template.target_species,
        scoring_method: template.scoring_method,
        base_points: template.base_points,
        status: 'active',
        is_active: true
      })
      .select()
      .single();

    if (eventError) {
      return res.status(500).json({ error: eventError.message });
    }

    // Erstelle Punkte-Config
    await supabase
      .from('event_point_configs')
      .insert({
        event_id: event.id,
        template_id: template_id,
        base_points: template.base_points,
        species_bonus: template.target_species ? { [template.target_species]: 50 } : {}
      });

    // Füge Creator als Teilnehmer hinzu
    await supabase
      .from('event_participants')
      .insert({
        event_id: event.id,
        user_id: req.user.email
      });

    return res.status(201).json({ ok: true, created: true, event });
  } catch (error) {
    console.error('Error starting competition:', error);
    res.status(500).json({ error: 'Fehler beim Starten des Wettbewerbs' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TRACKING & POINTS (Trip Completions, AI Interactions)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/events/activities/track', requireAuth, async (req, res) => {
  try {
    const { activityType, eventId } = req.body;

    if (!activityType || !eventId) {
      return res.status(400).json({ error: 'activityType und eventId erforderlich' });
    }

    if (!ACTIVITY_POINTS[activityType]) {
      return res.status(400).json({ error: `Unbekannter Activity Type: ${activityType}` });
    }

    // Prüfe ob User am Event teilnimmt
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', req.user.email)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'User ist nicht Teilnehmer des Events' });
    }

    // Addiere Punkte
    const result = await addActivityPoints(req.user.email, eventId, activityType, supabase);

    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ error: 'Fehler beim Tracken der Aktivität' });
  }
});

router.get('/events/activities/list', optionalAuth, async (req, res) => {
  try {
    return res.json(ACTIVITY_POINTS);
  } catch (error) {
    console.error('Error listing activities:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Aktivitäten' });
  }
});

// Get current month points for user
router.get('/events/user/current-points', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Finde alle aktiven Events diesen Monat
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'active')
      .gte('start_date', new Date(year, month - 1, 1).toISOString())
      .lte('end_date', new Date(year, month, 0, 23, 59, 59).toISOString());

    if (!events || events.length === 0) {
      return res.json({ total_points: 0, events: [], month, year });
    }

    const eventIds = events.map(e => e.id);

    // Aggregiere Punkte vom User für alle Events diesen Monat
    const { data: participants } = await supabase
      .from('event_participants')
      .select('total_points, event_id')
      .eq('user_id', req.user.email)
      .in('event_id', eventIds);

    const total = participants
      ? participants.reduce((sum, p) => sum + (parseFloat(p.total_points) || 0), 0)
      : 0;

    return res.json({
      total_points: Math.round(total * 100) / 100,
      month: month,
      year: year,
      active_events: events.length,
      participating_events: participants?.length || 0
    });
  } catch (error) {
    console.error('Error getting current points:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Punkte' });
  }
});

// Get active events with countdown
router.get('/events/user/active-event', requireAuth, async (req, res) => {
  try {
    const now = new Date();

    // Finde das nächste aktive Event für den User
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, end_date, start_date')
      .eq('status', 'active')
      .gt('end_date', now.toISOString())
      .order('end_date', { ascending: true })
      .limit(1)
      .single();

    if (!activeEvent) {
      return res.json({ active_event: null });
    }

    const endDate = new Date(activeEvent.end_date);
    const timeLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return res.json({
      active_event: {
        id: activeEvent.id,
        name: activeEvent.name,
        days_left: timeLeft,
        hours_left: Math.ceil((endDate - now) / (1000 * 60 * 60)),
        end_date: activeEvent.end_date
      }
    });
  } catch (error) {
    console.error('Error getting active event:', error);
    res.status(500).json({ error: 'Fehler beim Laden des aktiven Events' });
  }
});

export default router;
