import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { photo_url, species, length_cm, submission_id } = await req.json();

    if (!photo_url || !species || !length_cm || !submission_id) {
      return Response.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    const prompt = `Du bist ein Fischexperte. Bewerte diesen Fang:
Fischart: ${species}
Angegebene Laenge: ${length_cm} cm

Bewerte auf einer Skala von 0-100:
1. Plausibilitaet der Fischgroesse (Ist ${length_cm} cm realistisch fuer ${species}?)
2. Sichtbarkeit des Fisches im Bild (Ist der Fisch klar erkennbar?)
3. Uebereinstimmung von Art und Groesse (Passt die Groesse zur angegebenen Art?)

Gib eine ehrliche, faire Bewertung ab.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [photo_url],
      add_context_from_internet: false,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          plausibility: { type: "number", description: "Score 0-100" },
          visibility: { type: "number", description: "Score 0-100" },
          species_match: { type: "number", description: "Score 0-100" },
          explanation: { type: "string" },
          overall_score: { type: "number", description: "Durchschnitt 0-100" }
        },
        required: ["plausibility", "visibility", "species_match", "overall_score"]
      }
    });

    const ai_score = Math.round(aiResult.overall_score);

    const submissions = await base44.asServiceRole.entities.VotingSubmission.list('', 1000);
    const submission = submissions.find(s => s.id === submission_id);

    if (submission) {
      const community_likes = submission.community_likes || 0;
      const total_score = (community_likes * 0.7) + (ai_score * 0.3);

      await base44.asServiceRole.entities.VotingSubmission.update(submission_id, {
        ai_score,
        ai_analysis: {
          plausibility: aiResult.plausibility,
          visibility: aiResult.visibility,
          species_match: aiResult.species_match,
          explanation: aiResult.explanation
        },
        total_score: Math.round(total_score)
      });
    }

    return Response.json({ 
      success: true, 
      ai_score,
      analysis: aiResult
    });

  } catch (error) {
    console.error('Fehler bei KI-Bewertung:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});