import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CafeStore } from './store.mjs';

const path = process.env.QCAFE_DATABASE_PATH ?? '/data/q-cafe.sqlite';
mkdirSync(dirname(path), { recursive: true });
const store = new CafeStore(path);
if (process.env.QCAFE_DEMO === 'true') store.seed();
const token = process.env.QCAFE_API_TOKEN;
if (!token) throw new Error('QCAFE_API_TOKEN must be set.');
const actions = { orders: input => store.order(input), kitchen: input => store.advance(input), inventory: input => store.adjust(input), bookings: input => store.book(input) };
createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
  if (request.url === '/health' && request.method === 'GET') return send(200, { status: 'ok' });
  if (request.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Q Cafe sign-in required.' });
  if (request.url === '/api/v1/q-cafe' && request.method === 'GET') return send(200, { ...store.snapshot(), demo: process.env.QCAFE_DEMO === 'true' });
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
