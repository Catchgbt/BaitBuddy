import OpenAI from 'openai';

// Akzeptiert mehrere mögliche Variablennamen, da der Key in Vercel
// unterschiedlich benannt sein kann (OPENAI_API_KEY / OPEN_AI_KEY).
function getOpenAIKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPEN_AI_KEY ||
    process.env.OPENAI_KEY ||
    null
  );
}

export async function invokeLLM({ prompt, imageBase64 = null }) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('KI-Service nicht verfügbar – OPENAI_API_KEY fehlt in den Server-Einstellungen.');
  }

  const openai = new OpenAI({ apiKey });

  const messages = [];

  if (imageBase64) {
    const [header, data] = imageBase64.split(',');
    const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mediaType};base64,${data}` }
        },
        { type: 'text', text: prompt }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: prompt
    });
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    max_tokens: 1024
  });

  return response.choices[0].message.content;
}
