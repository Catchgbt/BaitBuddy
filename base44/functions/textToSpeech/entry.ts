import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('TTS: User not authenticated');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { text, speechRate = 1.0, voiceId = "21m00Tcm4TlvDq8ikWAM" } = body;
    
    if (!text || typeof text !== 'string') {
      console.log('TTS: Invalid text input:', typeof text, text);
      return Response.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('TTS: ElevenLabs API Key nicht gefunden');
      return Response.json({ error: 'ElevenLabs API Key nicht konfiguriert' }, { status: 500 });
    }

    // Clamp speech rate between 0.5 and 2.0
    const clampedRate = Math.min(2.0, Math.max(0.5, speechRate));
    const cleanText = String(text).slice(0, 1000).trim();

    console.log('TTS: Making request to ElevenLabs:', { 
      textLength: cleanText.length, 
      voiceId, 
      speechRate: clampedRate,
      textPreview: cleanText.slice(0, 100)
    });

    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speaking_rate: clampedRate
        }
      })
    });

    console.log('TTS: ElevenLabs response:', { 
      status: elevenLabsResponse.status, 
      statusText: elevenLabsResponse.statusText,
      contentType: elevenLabsResponse.headers.get('content-type')
    });

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text().catch(() => 'Unknown error');
      console.error('TTS: ElevenLabs API error:', elevenLabsResponse.status, errorText);
      return Response.json({ 
        error: `TTS generation failed: ${elevenLabsResponse.status} ${elevenLabsResponse.statusText}`,
        details: errorText 
      }, { status: elevenLabsResponse.status });
    }

    // Check if response is actually audio data
    const contentType = elevenLabsResponse.headers.get('content-type') || '';
    if (!contentType.includes('audio')) {
      const errorText = await elevenLabsResponse.text().catch(() => 'Unknown error');
      console.error('TTS: ElevenLabs returned non-audio content:', contentType, errorText);
      return Response.json({ 
        error: 'TTS service returned non-audio response',
        details: `Expected audio, got ${contentType}` 
      }, { status: 500 });
    }

    const audioData = await elevenLabsResponse.arrayBuffer();
    console.log('TTS: Audio generated successfully:', { 
      audioSize: audioData.byteLength,
      contentType 
    });
    
    if (audioData.byteLength === 0) {
      console.error('TTS: ElevenLabs returned empty audio data');
      return Response.json({ error: 'TTS service returned empty audio data' }, { status: 500 });
    }
    
    // Return the audio data directly
    return new Response(audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString()
      }
    });

  } catch (error) {
    console.error('TTS: Unexpected error:', error.message, error.stack);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});