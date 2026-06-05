import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catch_id, competition_id } = await req.json();

    if (!catch_id || !competition_id) {
      return Response.json({ error: 'catch_id und competition_id erforderlich' }, { status: 400 });
    }

    const catchData = await base44.entities.Catch.list('', 1000);
    const targetCatch = catchData.find(c => c.id === catch_id);

    if (!targetCatch) {
      return Response.json({ error: 'Fang nicht gefunden' }, { status: 404 });
    }

    if (targetCatch.created_by !== user.email) {
      return Response.json({ error: 'Nicht dein Fang' }, { status: 403 });
    }

    const existingSubmissions = await base44.entities.VotingSubmission.filter({
      catch_id: catch_id,
      competition_id: competition_id
    });

    if (existingSubmissions.length > 0) {
      return Response.json({ error: 'Fang bereits eingereicht' }, { status: 400 });
    }

    const submission = await base44.entities.VotingSubmission.create({
      competition_id,
      catch_id,
      user_id: user.email,
      photo_url: targetCatch.photo_url,
      species: targetCatch.species,
      length_cm: targetCatch.length_cm || 0,
      catch_time: targetCatch.catch_time,
      community_likes: 0,
      ai_score: 0,
      total_score: 0,
      is_suspicious: false
    });

    if (targetCatch.photo_url && targetCatch.species && targetCatch.length_cm) {
      try {
        const aiResponse = await base44.functions.invoke('aiEvaluateCatch', {
          photo_url: targetCatch.photo_url,
          species: targetCatch.species,
          length_cm: targetCatch.length_cm,
          submission_id: submission.id
        });
      } catch (aiError) {
        console.log('KI-Analyse fehlgeschlagen:', aiError);
      }
    }

    return Response.json({ 
      success: true, 
      submission,
      message: 'Fang erfolgreich eingereicht' 
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});