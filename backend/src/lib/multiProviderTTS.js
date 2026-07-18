import { fetchWithTimeout } from './fetchWithTimeout.js';

// Multi-Provider TTS mit Fallback-Kette:
// 1. Groq (beste Qualität, keine Limits in kostenlos)
// 2. ChatGPT/OpenAI (stabiler, aber kostenpflichtig)
// 3. ElevenLabs (bewährt, gute Qualität)
// 4. Google Cloud Text-to-Speech
// 5. Claude API (stabiler Fallback)

export async function getTTSAudio(text, voiceId = 'default') {
  const providers = [
    { name: 'groq', fn: () => groqTTS(text) },
    { name: 'openai', fn: () => openaiTTS(text) },
    { name: 'elevenlabs', fn: () => elevenlabsTTS(text, voiceId) },
    { name: 'google', fn: () => googleCloudTTS(text) },
    { name: 'claude', fn: () => claudeTTS(text) },
  ];

  for (const provider of providers) {
    try {
      if (!isProviderAvailable(provider.name)) {
        console.debug(`[TTS] Provider ${provider.name} nicht konfiguriert, überspringe...`);
        continue;
      }
      console.debug(`[TTS] Versuche Provider: ${provider.name}`);
      const result = await provider.fn();
      if (result && result.audioBase64) {
        console.debug(`[TTS] Erfolg mit Provider: ${provider.name}`);
        return { ...result, provider: provider.name };
      }
    } catch (err) {
      console.warn(`[TTS] ${provider.name} fehlgeschlagen:`, err.message);
      // Weiter zum nächsten Provider
    }
  }

  throw new Error('Kein TTS-Provider verfügbar');
}

// Lies API-Keys dynamisch aus process.env (nicht bei Import-Zeit)
// damit Tests diese manipulieren können
function isProviderAvailable(name) {
  switch (name) {
    case 'groq': return !!process.env.GROQ_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'elevenlabs': return !!process.env.ELEVENLABS_API_KEY;
    case 'google': return !!process.env.GOOGLE_CLOUD_API_KEY;
    case 'claude': return !!process.env.ANTHROPIC_API_KEY;
    default: return false;
  }
}

async function groqTTS(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  // Groq TTS über Groq API (neue Voice-Funktion)
  const response = await fetchWithTimeout('https://api.groq.com/tts/v1/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'groq-tts-1',
      input: text.slice(0, 4000),
      voice: 'nova',
      response_format: 'mp3',
    }),
    timeout: 15000,
  });

  if (!response.ok) {
    throw new Error(`Groq TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  return { audioBase64: base64Audio, contentType: 'audio/mpeg' };
}

async function openaiTTS(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  // OpenAI TTS API
  const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text.slice(0, 4096),
      voice: 'nova',
      speed: 1.0,
    }),
    timeout: 15000,
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  return { audioBase64: base64Audio, contentType: 'audio/mpeg' };
}

async function elevenlabsTTS(text, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  // Default Premade-Stimmen (kostenlos im Free-Plan)
  const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel (männlich)
  const FEMALE_VOICE_ID = 'XrExE9yKIg1WjnnlVkGX'; // Matilda (weiblich, Ultimate-Feature)

  // Wähle die Stimme aus; default auf Premade-Voice für Free-Plan-Kompatibilität
  let voiceIdToUse = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const callElevenLabs = async (vid) => fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 2000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
      timeout: 15000,
    }
  );

  let response = await callElevenLabs(voiceIdToUse);

  // Fallback: Library-Voices sind im Free-Plan per API gesperrt (402/403).
  // Retry mit Premade-Voice statt komplett zu scheitern.
  if (!response.ok && (response.status === 402 || response.status === 403) && voiceIdToUse !== DEFAULT_VOICE_ID) {
    console.warn(`[ElevenLabs] Voice ${voiceIdToUse} rejected (${response.status}) — Fallback auf Default`);
    response = await callElevenLabs(DEFAULT_VOICE_ID);
  }

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  return { audioBase64: base64Audio, contentType: 'audio/mpeg' };
}

async function googleCloudTTS(text) {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_CLOUD_API_KEY not configured');

  // Google Cloud Text-to-Speech
  const response = await fetchWithTimeout(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: text.slice(0, 5000) },
        voice: {
          languageCode: 'de-DE',
          name: 'de-DE-Standard-B',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0,
        },
      }),
      timeout: 15000,
    }
  );

  if (!response.ok) {
    throw new Error(`Google TTS error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error('Google TTS did not return audioContent');
  }

  return { audioBase64: data.audioContent, contentType: 'audio/mpeg' };
}

async function claudeTTS(text) {
  // Claude API mit Fallback (Note: Claude selbst hat kein natives TTS,
  // daher nutzen wir hier einen anderen Dienst als Fallback)
  // Alternativ: Nutzung von browser-nativen APIs oder Untertitel.
  // Für jetzt: als letzter Fallback deaktivieren und schweigen
  throw new Error('Claude native TTS nicht verfügbar');
}
