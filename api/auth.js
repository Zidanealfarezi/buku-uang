import { USERNAME, createUser, checkPassword, getUser, makeToken, guard } from './_lib.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// GET  /api/auth  (Bearer token)                          -> { username, name }
// POST /api/auth { mode:"signup", name, username, password } -> { token, username, name }
// POST /api/auth { mode:"login", username, password }        -> { token, username, name }
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const u = guard(req, res); if (!u) return;
    const user = await getUser(u);
    if (!user) return res.status(401).json({ error: 'login' });
    return res.json({ username: u, name: user.name });
  }
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!USERNAME.test(username)) return res.status(400).json({ error: 'Username 3–24 karakter: huruf kecil, angka, titik, atau garis bawah' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password minimal 8 karakter' });

  if (b.mode === 'signup') {
    if (process.env.ALLOW_SIGNUP === '0') return res.status(403).json({ error: 'Pendaftaran akun baru sedang ditutup' });
    const name = String(b.name || '').trim().slice(0, 40) || username;
    if (!(await createUser(username, password, name))) return res.status(409).json({ error: 'Username sudah dipakai' });
    return res.json({ token: makeToken(username), username, name });
  }
  const user = await checkPassword(username, password);
  if (!user) { await sleep(800); return res.status(401).json({ error: 'Username atau password salah' }); }
  return res.json({ token: makeToken(username), username, name: user.name });
}
