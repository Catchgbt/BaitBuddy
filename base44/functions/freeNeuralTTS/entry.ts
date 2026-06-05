// Kostenlose hochwertige neuronale TTS.
// Nutzt StreamElements (Polly-basiert, neuronale Stimmen, ohne Key, kostenlos).
// Fallback: Browser-TTS via Web Speech API.

const VOICE_MAP = {
  'de': 'Vicki',
  'de-DE': 'Vicki',
  'en': 'Joanna',
  'en-US': 'Joanna',
  'en-GB': 'Amy',
  'fr': 'Lea',
  'fr-FR': 'Lea',
  'es': 'Lucia',
  'es-ES': 'Lucia',
  'it': 'Bianca',
  'it-IT': 'Bianca',
  'nl': 'Lotte',
  'nl-NL': 'Lotte',
  'pl': 'Ewa',
  'pl-PL': 'Ewa',
  'pt': 'Ines',
  'pt-PT': 'Ines',
  'pt-BR': 'Camila',
  'sv': 'Astrid',
  'sv-SE': 'Astrid',
  'no': 'Liv',
  'da': 'Naja',
  'tr': 'Filiz',
  'ru': 'Tatyana',
  'ro': 'Carmen',
};

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, lang = 'de-DE', voice: voiceOverride } = body;

    if (!text || typeof text !== 'string') {
      return Response.json({ fallback_to_browser: true, reason: 'No text' });
    }

    const cleanText = String(text).slice(0, 3000).trim();
    if (!cleanText) {
      return Response.json({ fallback_to_browser: true, reason: 'Empty text' });
    }

    const voice = voiceOverride || VOICE_MAP[lang] || VOICE_MAP[lang.split('-')[0]] || 'Vicki';

    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(cleanText)}`;

    const ttsRes = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!ttsRes.ok) {
      return Response.json({
        fallback_to_browser: true,
        reason: `TTS HTTP ${ttsRes.status}`
      });
    }

    const contentType = ttsRes.headers.get('content-type') || '';
    if (!contentType.includes('audio') && !contentType.includes('mpeg')) {
      return Response.json({
        fallback_to_browser: true,
        reason: `Unexpected content-type: ${contentType}`
      });
    }

    const audioData = await ttsRes.arrayBuffer();
    if (!audioData || audioData.byteLength === 0) {
      return Response.json({ fallback_to_browser: true, reason: 'Empty audio' });
    }

    return new Response(audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[freeNeuralTTS] Error:', error.message);
    return Response.json({
      fallback_to_browser: true,
      reason: error.message
    });
  }
});