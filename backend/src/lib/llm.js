import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function invokeLLM({ prompt, imageBase64 = null }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('KI-Service nicht verfügbar – ANTHROPIC_API_KEY fehlt in den Server-Einstellungen.');
  }

  const content = [{ type: 'text', text: prompt }];

  if (imageBase64) {
    const [header, data] = imageBase64.split(',');
    const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    content.unshift({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
  }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content }]
  });

  return msg.content[0].text;
}
