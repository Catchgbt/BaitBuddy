import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submission_id, competition_id } = await req.json();

    if (!submission_id || !competition_id) {
      return Response.json({ error: 'submission_id und competition_id erforderlich' }, { status: 400 });
    }

    const existingLikes = await base44.entities.VotingLike.filter({
      submission_id,
      user_id: user.email
    });

    if (existingLikes.length > 0) {
      return Response.json({ error: 'Du hast bereits geliked' }, { status: 400 });
    }

    await base44.entities.VotingLike.create({
      submission_id,
      user_id: user.email,
      competition_id
    });

    const submissions = await base44.asServiceRole.entities.VotingSubmission.list('', 1000);
    const submission = submissions.find(s => s.id === submission_id);

    if (submission) {
      const newLikesCount = (submission.community_likes || 0) + 1;
      const ai_score = submission.ai_score || 0;
      const total_score = (newLikesCount * 0.7) + (ai_score * 0.3);

      await base44.asServiceRole.entities.VotingSubmission.update(submission_id, {
        community_likes: newLikesCount,
        total_score: Math.round(total_score)
      });
    }

    return Response.json({ 
      success: true,
      message: 'Like erfolgreich'
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});