import { get, put, del } from '@vercel/blob';
import { guard } from './_lib.js';

const ID = /^[A-Za-z0-9_-]{6,40}$/;
const path = (u, id) => `bukuuang/media/${u}/${id}.jpg`;

// POST   /api/media { image: dataURL }  -> { id }
// GET    /api/media?id=...              -> the image (only the owner's)
// DELETE /api/media?id=...
export default async function handler(req, res) {
  const u = guard(req, res); if (!u) return;
  if (req.method === 'POST') {
    const m = typeof req.body?.image === 'string' && req.body.image.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'image' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 3_500_000) return res.status(413).json({ error: 'besar' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await put(path(u, id), buf, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
    return res.json({ id });
  }
  const id = String(req.query.id || '');
  if (!ID.test(id)) return res.status(400).json({ error: 'id' });
  if (req.method === 'GET') {
    const r = await get(path(u, id), { access: 'private' }).catch(() => null);
    if (!r || r.statusCode !== 200) return res.status(404).end();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.send(Buffer.from(await new Response(r.stream).arrayBuffer()));
  }
  if (req.method === 'DELETE') {
    const r = await get(path(u, id), { access: 'private' }).catch(() => null);
    if (r?.blob?.url) await del(r.blob.url).catch(() => {});
    return res.json({ ok: true });
  }
  return res.status(405).end();
}
