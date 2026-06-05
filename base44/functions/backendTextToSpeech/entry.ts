import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Kostenlose TTS-Strategie: Always fallback to browser-native Web Speech API.
// Keine externen kostenpflichtigen APIs werden mehr verwendet.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user) {
      return Response.json({
        fallback_to_browser: true,
        reason: 'Not authenticated - use free browser TTS'
      });
    }

    return Response.json({
      fallback_to_browser: true,
      reason: 'Using free browser-native Web Speech API'
    });
  } catch (error) {
    return Response.json({
      fallback_to_browser: true,
      reason: 'Using free browser TTS'
    });
  }
});