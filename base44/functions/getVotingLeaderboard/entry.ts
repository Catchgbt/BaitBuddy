import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { competition_id } = await req.json();

    if (!competition_id) {
      return Response.json({ error: 'competition_id erforderlich' }, { status: 400 });
    }

    const submissions = await base44.entities.VotingSubmission.filter({
      competition_id
    });

    const leaderboard = submissions
      .filter(s => !s.is_suspicious)
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((s, index) => ({
        rank: index + 1,
        user_id: s.user_id,
        species: s.species,
        length_cm: s.length_cm,
        photo_url: s.photo_url,
        community_likes: s.community_likes || 0,
        ai_score: s.ai_score || 0,
        total_score: s.total_score || 0,
        submission_id: s.id
      }));

    const disqualified = submissions
      .filter(s => s.is_suspicious)
      .map(s => ({
        user_id: s.user_id,
        reason: s.disqualification_reason || 'Verdaechtige Aktivitaet'
      }));

    return Response.json({ 
      success: true,
      leaderboard,
      disqualified,
      total_submissions: submissions.length
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});