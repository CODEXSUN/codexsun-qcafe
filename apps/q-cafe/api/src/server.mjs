import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { CafeStore } from './store.mjs';

const path = process.env.QCAFE_DATABASE_PATH ?? '/data/q-cafe.sqlite';
mkdirSync(dirname(path), { recursive: true });
const imageDirectory = process.env.QCAFE_IMAGE_DIRECTORY;
if (!imageDirectory) throw new Error('QCAFE_IMAGE_DIRECTORY must point to the images folder beside the Q Cafe database.');
mkdirSync(imageDirectory, { recursive: true });
const store = new CafeStore(path);
if (process.env.QCAFE_BOOTSTRAP_OWNER_PIN) store.bootstrapOwner(process.env.QCAFE_BOOTSTRAP_OWNER_PIN);
const token = process.env.QCAFE_API_TOKEN;
if (!token) throw new Error('QCAFE_API_TOKEN must be set.');
const actions = { orders: ['cashier', input => store.order(input)], pos: ['cashier', input => store.createPos(input)], receipts: ['cashier', input => store.recordReceipt(input)], kitchen: ['kitchen', input => store.advance(input)], inventory: ['manager', input => store.adjust(input)], bookings: ['waiter', input => store.book(input)], category: ['manager', input => store.saveCategory(input)], 'category/delete': ['manager', input => store.deleteCategory(input)], item: ['manager', input => store.saveItem(input)], 'item/delete': ['manager', input => store.deleteItem(input)], table: ['manager', input => store.saveRestaurantTable(input)], 'table/delete': ['manager', input => store.deleteRestaurantTable(input)], 'master-setting': ['manager', input => store.saveMasterSetting(input)], image: ['manager', saveImage], 'verify-image-folder': ['manager', verifyImageFolder], 'open-image-folder': ['manager', openImageFolder] };
const sessions = new Map();
let shutdownRequested = false;
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  if (['tauri://localhost', 'http://tauri.localhost', 'http://127.0.0.1:5180', 'http://localhost:5180'].includes(request.headers.origin)) { response.setHeader('Access-Control-Allow-Origin', request.headers.origin); response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); response.setHeader('Vary', 'Origin'); }
  const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
  if (request.method === 'OPTIONS') return send(204, {});
  if (request.url === '/health' && request.method === 'GET') return send(200, { status: 'ok' });
  if (request.url === '/internal/shutdown' && request.method === 'POST') {
    if (request.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Q Cafe desktop authorization is required.' });
    send(200, { status: 'stopping' });
    setTimeout(shutdown, 0);
    return;
  }
  if (request.url === '/api/v1/q-cafe/auth/setup' && request.method === 'POST') return setupOwner(request, send);
  if ((request.url === '/api/v1/q-cafe/auth/pin' || request.url === '/api/v1/q-cafe/auth/login') && request.method === 'POST') return signIn(request, send);
  if (request.url?.startsWith('/api/v1/q-cafe/images/') && request.method === 'GET') return image(request, response);
  const identity = isAuthorized(request); if (!identity) return send(401, { error: 'Q Cafe sign-in required.' });
  if (request.url === '/api/v1/q-cafe' && request.method === 'GET') return send(200, { ...store.snapshot(), storage: { image_directory: imageDirectory }, user: identity });
  if (request.url === '/api/v1/q-cafe/sync/pending' && request.method === 'GET') return send(200, { changes: store.pendingSync() });
  const action = actions[request.url?.replace('/api/v1/q-cafe/', '')]; if (!action || request.method !== 'POST') return send(404, { error: 'Route not found.' });
  if (!hasRole(identity.role, action[0])) return send(403, { error: 'Your Q Cafe role cannot perform this action.' });
  try { const input = await body(request, action === actions.image ? 7_000_000 : 32768); const result = action[1](input); send(200, { ok: true, result }); } catch (error) { send(400, { error: error instanceof Error ? error.message : 'Invalid request.' }); }
});

server.listen(Number(process.env.QCAFE_API_PORT ?? 4180), '0.0.0.0');
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

function shutdown() {
  if (shutdownRequested) return;
  shutdownRequested = true;
  server.close(() => {
    store.db.close();
    process.exit(0);
  });
  setTimeout(() => {
    store.db.close();
    process.exit(1);
  }, 5_000).unref();
}

async function setupOwner(request, send) { try { const input = await body(request, 2048); const owner = store.setupOwner(input); return session(owner, send); } catch (error) { return send(400, { error: error instanceof Error ? error.message : 'Owner setup failed.' }); } }
async function signIn(request, send) { try { const input = await body(request, 2048); const pin = input?.pin ?? input?.password; return session(input?.username ? store.signInStaff(input.username, pin) : store.signInPin(pin), send); } catch (error) { return send(401, { error: error instanceof Error ? error.message : 'Unable to sign in.' }); } }
function session(user, send) { const accessToken = randomUUID(); sessions.set(accessToken, { ...user, expiresAt: Date.now() + 12 * 60 * 60 * 1000 }); return send(200, { access_token: accessToken, expires_in: 12 * 60 * 60, user }); }
async function body(request, limit) { let value = ''; for await (const chunk of request) { value += chunk; if (value.length > limit) throw new Error('Request too large.'); } const input = JSON.parse(value); if (!input || typeof input !== 'object') throw new Error('Invalid request.'); return input; }
function isAuthorized(request) { if (request.headers.authorization === `Bearer ${token}`) return { id: 0, login: 'operator', name: 'Technical operator', role: 'owner' }; const key = request.headers.authorization?.replace(/^Bearer /u, ''); const session = key ? sessions.get(key) : undefined; if (!session || session.expiresAt <= Date.now()) { if (key) sessions.delete(key); return null; } return session; }
function hasRole(current, required) { const ranks = { kitchen: 1, waiter: 1, cashier: 2, manager: 3, owner: 4 }; return ranks[current] >= ranks[required]; }

function verifyImageFolder() {
  const probe = join(imageDirectory, '.q-cafe-image-storage-probe');
  writeFileSync(probe, 'ok');
  rmSync(probe, { force: true });
  return { ok: true, folderPath: imageDirectory, isWriteProtected: false, canWrite: true, message: 'Q Cafe image storage is verified and writable.', timestamp: new Date().toLocaleString() };
}

function openImageFolder() {
  if (process.platform === 'win32') spawn('explorer.exe', [imageDirectory], { detached: true, stdio: 'ignore' }).unref();
  return { folderPath: imageDirectory };
}

function saveImage(input) {
  const content = typeof input.content_base64 === 'string' ? input.content_base64 : '';
  const type = typeof input.content_type === 'string' ? input.content_type : '';
  const suppliedName = typeof input.file_name === 'string' ? input.file_name : '';
  const fileName = basename(suppliedName.replaceAll('\\', '/'));
  const extension = extname(fileName).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension) || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (!isSafeImageName(fileName)) throw new Error('Use an image name with up to 120 safe characters.');
  const bytes = Buffer.from(content, 'base64');
  if (!bytes.length || bytes.length > 5_000_000) throw new Error('Choose an image smaller than 5 MB.');
  const target = join(imageDirectory, fileName);
  if (existsSync(target)) {
    if (readFileSync(target).equals(bytes)) return { file_name: fileName, folder_path: imageDirectory };
    throw new Error('An image with this file name already exists. Choose a different source file name.');
  }
  writeFileSync(target, bytes, { flag: 'wx' });
  return { file_name: fileName, folder_path: imageDirectory };
}

function image(request, response) {
  const fileName = basename(decodeURIComponent(request.url ?? ''));
  const file = join(imageDirectory, fileName);
  if (!isSafeImageName(fileName) || !existsSync(file)) {
    response.writeHead(404, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Image not found.' })); return;
  }
  const contentType = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400' }); response.end(readFileSync(file));
}

function isSafeImageName(value) {
  return /^[^<>:"/\\|?*\x00-\x1f]{1,120}\.(?:jpe?g|png|webp)$/iu.test(value);
}
