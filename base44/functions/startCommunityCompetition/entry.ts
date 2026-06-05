import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TEMPLATES = {
  biggest_pike_week: {
    title: 'Groesster Hecht der Woche',
    description: 'Wer faengt diese Woche den groessten Hecht? Gewertet wird nach Laenge in cm.',
    competition_type: 'specific_species',
    target_species: 'Hecht',
    duration_days: 7,
    prize: 'Ruhm und Ehre in der Community'
  },
  biggest_carp_month: {
    title: 'Groesster Karpfen des Monats',
    description: 'Wer hat den dicksten Karpfen? Gewertet wird nach Gewicht in kg.',
    competition_type: 'specific_species',
    target_species: 'Karpfen',
    duration_days: 30,
    prize: 'Community-Champion-Titel'
  },
  most_catches_week: {
    title: 'Faengiger Angler der Woche',
    description: 'Wer faengt in dieser Woche die meisten Fische? Jeder Fang zaehlt.',
    competition_type: 'most_catches',
    duration_days: 7,
    prize: 'Top-Angler-Badge'
  },
  biggest_catch_week: {
    title: 'Groesster Fang der Woche',
    description: 'Egal welche Art - der laengste Fisch dieser Woche gewinnt.',
    competition_type: 'biggest_catch',
    duration_days: 7,
    prize: 'Community-Trophaee'
  },
  photo_contest_week: {
    title: 'Foto-Wettbewerb der Woche',
    description: 'Reiche dein bestes Fangfoto ein. Die Community stimmt ab.',
    competition_type: 'photo_contest',
    duration_days: 7,
    prize: 'Foto-des-Monats-Badge'
  },
  zander_night_week: {
    title: 'Zander-Nights',
    description: 'Eine Woche lang Zander-Action. Wer faengt den groessten Stachelritter?',
    competition_type: 'specific_species',
    target_species: 'Zander',
    duration_days: 7,
    prize: 'Zander-King-Titel'
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_id } = await req.json();
    const tpl = TEMPLATES[template_id];
    if (!tpl) {
      return Response.json({ error: 'Unbekannte Vorlage' }, { status: 400 });
    }

    const start = new Date();
    const end = new Date(start.getTime() + tpl.duration_days * 24 * 60 * 60 * 1000);

    const existing = await base44.asServiceRole.entities.Competition.filter({
      title: tpl.title,
      is_active: true
    });

    const stillRunning = existing.find(c => new Date(c.end_date) > new Date());
    if (stillRunning) {
      const updatedParticipants = Array.from(new Set([...(stillRunning.participants || []), user.email]));
      await base44.asServiceRole.entities.Competition.update(stillRunning.id, {
        participants: updatedParticipants
      });
      return Response.json({ competition: { ...stillRunning, participants: updatedParticipants }, joined: true });
    }

    const competition = await base44.asServiceRole.entities.Competition.create({
      title: tpl.title,
      description: tpl.description,
      competition_type: tpl.competition_type,
      target_species: tpl.target_species || null,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      prize: tpl.prize,
      is_active: true,
      participants: [user.email],
      submissions: []
    });

    return Response.json({ competition, created: true });
  } catch (error) {
    console.error('startCommunityCompetition error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});