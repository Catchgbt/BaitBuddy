import { GoogleGenerativeAI } from '@google/generative-ai';

// Akzeptiert mehrere mögliche Variablennamen für den Gemini-Key.
function getGeminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    null
  );
}

export async function invokeLLM({ prompt, imageBase64 = null }) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('KI-Service nicht verfügbar – GEMINI_API_KEY fehlt in den Server-Einstellungen.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const parts = [];

  if (imageBase64) {
    const [header, data] = imageBase64.split(',');
    const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    parts.push({
      inlineData: {
        mimeType: mediaType,
        data: data
      }
    });
  }

  parts.push({ text: prompt });

  const result = await model.generateContent({
    contents: [{ parts }]
  });

  return result.response.text();
}
