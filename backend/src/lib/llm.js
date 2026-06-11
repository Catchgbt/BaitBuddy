import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function invokeLLM({ prompt, imageBase64 = null }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('KI-Service nicht verfügbar – GEMINI_API_KEY fehlt in den Server-Einstellungen.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
