import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function invokeLLM({ prompt, imageBase64 = null }) {
  const content = [{ type: 'text', text: prompt }];

  if (imageBase64) {
    const [header, data] = imageBase64.split(',');
    const mediaType = header.match(/:(.*?);/)[1];
    content.unshift({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
  }

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content }]
  });

  return msg.content[0].text;
}
