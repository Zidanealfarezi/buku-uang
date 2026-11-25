import { guard, loadData, saveData } from './_lib.js';

const COLS = new Set(['akun', 'tx', 'hutang']);
const ID = /^[A-Za-z0-9_-]{1,40}$/;

// GET  /api/data                     -> { akun, tx, hutang }
// POST /api/data { ops:[{col,id,obj}] } -> obj=null deletes; returns the saved state
export default async function handler(req, res) {
  const u = guard(req, res); if (!u) return;
  if (req.method === 'GET') return res.json(await loadData(u));
  if (req.method !== 'POST') return res.status(405).end();
  const ops = req.body && Array.isArray(req.body.ops) ? req.body.ops : null;
  if (!ops || !ops.length || ops.length > 200) return res.status(400).json({ error: 'ops' });
  const d = await loadData(u);
  for (const o of ops) {
    if (!o || !COLS.has(o.col) || !ID.test(String(o.id))) return res.status(400).json({ error: 'op' });
    if (o.obj === null) delete d[o.col][o.id];
    else if (o.obj && typeof o.obj === 'object' && !Array.isArray(o.obj)) d[o.col][o.id] = o.obj;
    else return res.status(400).json({ error: 'obj' });
  }
  if (JSON.stringify(d).length > 4_000_000) return res.status(413).json({ error: 'penuh' });
  await saveData(u, d);
  return res.json(d);
}
