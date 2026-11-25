import { authState, setPin, checkPin } from './_lib.js';

// GET  /api/auth            -> { setup: boolean }  (setup=true means a PIN already exists)
// POST /api/auth {pin, mode} -> mode "setup" creates the PIN once; mode "check" verifies it.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const a = await authState();
    return res.json({ setup: !!a });
  }
  if (req.method !== 'POST') return res.status(405).end();
  const { pin, mode } = req.body || {};
  if (typeof pin !== 'string' || pin.length < 6 || pin.length > 64) return res.status(400).json({ error: 'PIN minimal 6 karakter' });
  const a = await authState();
  if (mode === 'setup') {
    if (a) return res.status(409).json({ error: 'PIN sudah dibuat' });
    await setPin(pin);
    return res.json({ ok: true });
  }
  if (await checkPin(pin)) return res.json({ ok: true });
  await new Promise(r => setTimeout(r, 900));
  return res.status(401).json({ error: 'PIN salah' });
}
