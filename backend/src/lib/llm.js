// Groq API (OpenAI-kompatibel) – kein SDK nötig, nutzt natives fetch.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Text-Modell und Vision-Modell (für Bildanalyse)
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Akzeptiert mehrere mögliche Variablennamen für den Groq-Key.
function getGroqKey() {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROG_API_KEY ||
    process.env.GROK_API_KEY ||
    null
  );
}

export async function invokeLLM({ prompt, imageBase64 = null }) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error('KI-Service nicht verfügbar – GROQ_API_KEY fehlt in den Server-Einstellungen.');
  }

  const messages = [];
  let model = TEXT_MODEL;

  if (imageBase64) {
    model = VISION_MODEL;
    const url = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url } },
        { type: 'text', text: prompt }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API Fehler ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error(`LLM returned invalid response: missing or invalid content. Response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return content;
}
