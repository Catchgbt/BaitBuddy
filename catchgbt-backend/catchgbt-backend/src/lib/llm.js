import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * InvokeLLM – Drop-in Ersatz für base44.integrations.Core.InvokeLLM
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string[]} [opts.file_urls]          - Bild-URLs für Vision
 * @param {object}  [opts.response_json_schema] - Falls JSON-Output gewünscht
 * @param {string}  [opts.model]               - ignoriert, immer claude-sonnet-4-6
 */
export async function invokeLLM({ prompt, file_urls = [], response_json_schema = null }) {
  const contentParts = [];

  // Bilder als base64 einbetten
  for (const url of file_urls) {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const ct = res.headers.get('content-type') || 'image/jpeg';
      contentParts.push({
        type: 'image',
        source: { type: 'base64', media_type: ct, data: b64 }
      });
    } catch (e) {
      console.warn('[invokeLLM] Bild konnte nicht geladen werden:', url, e.message);
    }
  }

  let systemPrompt = '';
  let userPrompt = prompt;

  if (response_json_schema) {
    systemPrompt = 'Antworte NUR mit validem JSON. Kein Markdown, keine Erklärungen, kein Text davor oder danach.';
    userPrompt = `${prompt}\n\nErwartetes JSON-Schema: ${JSON.stringify(response_json_schema, null, 2)}`;
  }

  contentParts.push({ type: 'text', text: userPrompt });

  const params = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: contentParts }]
  };

  if (systemPrompt) params.system = systemPrompt;

  const response = await client.messages.create(params);
  const rawText = response.content.find(b => b.type === 'text')?.text || '';

  if (response_json_schema) {
    try {
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      console.error('[invokeLLM] JSON-Parse fehlgeschlagen:', rawText);
      throw new Error('LLM hat kein gültiges JSON zurückgegeben');
    }
  }

  return rawText;
}
