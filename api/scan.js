import { guard } from './_lib.js';

// GET  /api/scan            -> { enabled }  (needs ANTHROPIC_API_KEY in Vercel env)
// POST /api/scan {image, prompt} -> parsed JSON from Claude
export default async function handler(req, res) {
  if (!(await guard(req, res))) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return res.json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).end();
  if (!key) return res.status(501).json({ error: 'off' });
  const { image, prompt } = req.body || {};
  const m = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m || typeof prompt !== 'string' || prompt.length > 8000) return res.status(400).json({ error: 'input' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text: prompt },
      ] }],
    }),
  });
  if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status });
  const j = await r.json();
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  try { return res.json(JSON.parse(text.slice(s, e + 1))); }
  catch { return res.status(422).json({ error: 'json' }); }
}
