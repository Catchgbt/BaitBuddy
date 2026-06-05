import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('[Gemini TTS] User not authenticated');
      return Response.json({ 
        fallback_to_browser: true,
        reason: 'Not authenticated'
      });
    }

    const body = await req.json().catch(() => ({}));
    const { text, speechRate = 1.0 } = body;
    
    if (!text || typeof text !== 'string') {
      console.log('[Gemini TTS] Invalid text input');
      return Response.json({ 
        fallback_to_browser: true,
        reason: 'Invalid text'
      });
    }

    const cleanText = String(text).slice(0, 1000).trim();
    
    if (!cleanText) {
      console.log('[Gemini TTS] Empty text after cleaning');
      return Response.json({ 
        fallback_to_browser: true,
        reason: 'Empty text'
      });
    }

    const geminiKey = Deno.env.get('Geminiapi');
    if (!geminiKey) {
      console.log('[Gemini TTS] No Gemini API key found - using browser fallback');
      return Response.json({ 
        fallback_to_browser: true,
        reason: 'No API key'
      });
    }

    try {
      console.log(`[Gemini TTS] Processing: ${cleanText.length} chars for ${user.email}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Call Gemini API for Text-to-Speech
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta1/models/gemini-2.0-flash-exp:streamGenerateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate audio speech in German language for this text. Return only the audio data in a format suitable for playback: "${cleanText}"`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topP: 1,
              topK: 1,
              maxOutputTokens: 1024
            }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('[Gemini TTS] API error:', geminiResponse.status, errorText);
        return Response.json({ 
          fallback_to_browser: true,
          reason: `API error: ${geminiResponse.status}`
        });
      }

      // For now, fall back to browser TTS as Gemini API response handling is complex
      // Future: implement proper audio streaming from Gemini
      console.log('[Gemini TTS] Falling back to browser TTS for audio generation');
      
      return Response.json({ 
        fallback_to_browser: true,
        reason: 'Using browser TTS'
      });

    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error('[Gemini TTS] Request timeout');
        return Response.json({ 
          fallback_to_browser: true,
          reason: 'Timeout'
        });
      }
      
      console.error('[Gemini TTS] Fetch error:', fetchError.message);
      return Response.json({ 
        fallback_to_browser: true,
        reason: fetchError.message
      });
    }

  } catch (error) {
    console.error('[Gemini TTS] Unexpected error:', error.message);
    return Response.json({ 
      fallback_to_browser: true,
      reason: 'Unexpected error'
    });
  }
});