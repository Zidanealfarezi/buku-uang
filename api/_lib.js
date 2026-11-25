import { get, put } from '@vercel/blob';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const DATA = 'bukuuang/data.json';
const AUTH = 'bukuuang/auth.json';
const EMPTY = { akun: {}, tx: {}, hutang: {} };

async function readJson(path) {
  const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  try { return JSON.parse(await new Response(r.stream).text()); } catch { return null; }
}
async function writeJson(path, obj) {
  await put(path, JSON.stringify(obj), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false,
    contentType: 'application/json', cacheControlMaxAge: 60,
  });
}

export async function loadData() {
  const d = await readJson(DATA);
  if (d && d.akun) return d;
  let init = EMPTY;
  try { if (process.env.INITIAL_DATA) init = { ...EMPTY, ...JSON.parse(process.env.INITIAL_DATA) }; } catch {}
  return structuredClone(init);
}
export const saveData = d => writeJson(DATA, d);

const hash = (pin, salt) => scryptSync(String(pin), salt, 32).toString('hex');
export async function authState() { return readJson(AUTH); }
export async function setPin(pin) {
  const salt = randomBytes(16).toString('hex');
  await writeJson(AUTH, { salt, hash: hash(pin, salt), at: Date.now() });
}
export async function checkPin(pin) {
  const a = await authState();
  if (!a || !pin) return false;
  const h = Buffer.from(hash(pin, a.salt), 'hex'), w = Buffer.from(a.hash, 'hex');
  return h.length === w.length && timingSafeEqual(h, w);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Returns true when the request carries the right PIN; otherwise answers 401 and returns false. */
export async function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const pin = req.headers['x-pin'];
  if (await checkPin(pin)) return true;
  await sleep(700);
  res.status(401).json({ error: 'pin' });
  return false;
}
