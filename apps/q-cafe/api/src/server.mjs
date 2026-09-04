import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CafeStore } from './store.mjs';

const path = process.env.QCAFE_DATABASE_PATH ?? '/data/q-cafe.sqlite';
mkdirSync(dirname(path), { recursive: true });
const store = new CafeStore(path);
if (process.env.QCAFE_DEMO === 'true') store.seed();
const token = process.env.QCAFE_API_TOKEN;
if (!token) throw new Error('QCAFE_API_TOKEN must be set.');
const cashierPin = process.env.QCAFE_CASHIER_PIN;
if (!/^\d{4}$/u.test(cashierPin ?? '')) throw new Error('QCAFE_CASHIER_PIN must be exactly four digits.');
const actions = { orders: input => store.order(input), pos: input => store.createPos(input), receipts: input => store.recordReceipt(input), kitchen: input => store.advance(input), inventory: input => store.adjust(input), bookings: input => store.book(input) };
const sessions = new Map();
const attempts = new Map();
createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  if (['tauri://localhost', 'http://tauri.localhost', 'http://127.0.0.1:5180', 'http://localhost:5180'].includes(request.headers.origin)) {
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.setHeader('Vary', 'Origin');
  }
  const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
  if (request.method === 'OPTIONS') return send(204, {});
  if (request.url === '/health' && request.method === 'GET') return send(200, { status: 'ok' });
  if (request.url === '/api/v1/q-cafe/auth/pin' && request.method === 'POST') return signIn(request, send);
  if (!isAuthorized(request)) return send(401, { error: 'Q Cafe sign-in required.' });
  if (request.url === '/api/v1/q-cafe' && request.method === 'GET') return send(200, { ...store.snapshot(), demo: process.env.QCAFE_DEMO === 'true' });
  if (request.url === '/api/v1/q-cafe/sync/pending' && request.method === 'GET') return send(200, { changes: store.pendingSync() });
  const action = actions[request.url?.replace('/api/v1/q-cafe/', '')];
  if (!action || request.method !== 'POST') return send(404, { error: 'Route not found.' });
  try {
    let body = '';
    for await (const chunk of request) { body += chunk; if (body.length > 32768) return send(413, { error: 'Request too large.' }); }
    const input = JSON.parse(body);
    if (!input || typeof input !== 'object') throw new Error('Invalid request.');
    const result = action(input);
    send(200, { ok: true, result });
  } catch (error) { send(400, { error: error instanceof Error ? error.message : 'Invalid request.' }); }
}).listen(Number(process.env.QCAFE_API_PORT ?? 4180), '0.0.0.0');

async function signIn(request, send) {
  const address = request.socket.remoteAddress ?? 'unknown';
  const attempt = attempts.get(address);
  if (attempt?.blockedUntil > Date.now()) return send(429, { error: 'Too many attempts. Try again shortly.' });
  try {
    let body = '';
    for await (const chunk of request) { body += chunk; if (body.length > 1024) return send(413, { error: 'Request too large.' }); }
    const input = JSON.parse(body);
    if (!input || input.pin !== cashierPin) throw new Error('Incorrect PIN.');
    attempts.delete(address);
    const accessToken = randomUUID();
    sessions.set(accessToken, Date.now() + 12 * 60 * 60 * 1000);
    return send(200, { access_token: accessToken, expires_in: 12 * 60 * 60 });
  } catch (error) {
    const count = (attempt?.count ?? 0) + 1;
    attempts.set(address, { count, blockedUntil: count >= 5 ? Date.now() + 30_000 : 0 });
    return send(401, { error: error instanceof Error ? error.message : 'Unable to sign in.' });
  }
}

function isAuthorized(request) {
  if (request.headers.authorization === `Bearer ${token}`) return true;
  const session = request.headers.authorization?.replace(/^Bearer /u, '');
  const expiresAt = session ? sessions.get(session) : undefined;
  if (!expiresAt || expiresAt <= Date.now()) { if (session) sessions.delete(session); return false; }
  return true;
}
