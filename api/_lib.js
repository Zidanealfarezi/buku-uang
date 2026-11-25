import { get, put } from '@vercel/blob';
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from 'node:crypto';

const EMPTY = { akun: {}, tx: {}, hutang: {} };
const USERS = 'bukuuang/users/';
const dataPath = u => `bukuuang/data/${u}.json`;

async function readJson(path) {
  const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  try { return JSON.parse(await new Response(r.stream).text()); } catch { return null; }
}
async function writeJson(path, obj, overwrite = true) {
  await put(path, JSON.stringify(obj), {
    access: 'private', allowOverwrite: overwrite, addRandomSuffix: false,
    contentType: 'application/json', cacheControlMaxAge: 60,
  });
}

/* ---------- data per user ---------- */
export async function loadData(u) {
  const d = await readJson(dataPath(u));
  if (d && d.akun) return d;
  return structuredClone(EMPTY);
}
export const saveData = (u, d) => writeJson(dataPath(u), d);

/* ---------- users ---------- */
export const USERNAME = /^[a-z0-9_.]{3,24}$/;
const hash = (pw, salt) => scryptSync(String(pw), salt, 32).toString('hex');
export const getUser = u => readJson(USERS + u + '.json');

export async function createUser(username, password, name) {
  if (await getUser(username)) return false;
  const salt = randomBytes(16).toString('hex');
  try { await writeJson(USERS + username + '.json', { name, salt, hash: hash(password, salt), created: Date.now() }, false); }
  catch { return false; } // already exists
  // The very first account receives the migrated starting data, if any.
  const first = !(await readJson('bukuuang/meta.json'));
  if (first) {
    await writeJson('bukuuang/meta.json', { owner: username, at: Date.now() });
    let init = EMPTY;
    try { if (process.env.INITIAL_DATA) init = { ...EMPTY, ...JSON.parse(process.env.INITIAL_DATA) }; } catch {}
    await saveData(username, init);
  }
  return true;
}
export async function checkPassword(username, password) {
  const u = await getUser(username);
  if (!u) { hash(password, 'x'); return null; }
  const a = Buffer.from(hash(password, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? u : null;
}

/* ---------- session tokens (HMAC, 60 days) ---------- */
const KEY = () => createHash('sha256').update('bukuuang-session:' + (process.env.SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || '')).digest();
const b64 = s => Buffer.from(s).toString('base64url');
export function makeToken(u) {
  const body = b64(JSON.stringify({ u, exp: Date.now() + 60 * 864e5 }));
  return body + '.' + createHmac('sha256', KEY()).update(body).digest('base64url');
}
export function readToken(t) {
  if (typeof t !== 'string' || !t.includes('.')) return null;
  const [body, sig] = t.split('.');
  const want = createHmac('sha256', KEY()).update(body).digest('base64url');
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() && USERNAME.test(p.u) ? p.u : null; }
  catch { return null; }
}

/** Returns the signed-in username, or answers 401 and returns null. */
export function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const h = req.headers.authorization || '';
  const u = readToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!u) { res.status(401).json({ error: 'login' }); return null; }
  return u;
}
