import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SqliteNeotRepository } from './infrastructure/sqlite-repository.mjs';
import { NeotCloudClient } from './infrastructure/neot-cloud-client.mjs';
import { StudyService } from './application/study-service.mjs';
import { AssessmentService } from './application/assessment-service.mjs';
import { NeotSyncService } from './application/sync-service.mjs';
import { NeotRouter } from './interfaces/http/neot-router.mjs';

const port = Number(process.env.NEOT_API_PORT ?? 4250);
const dbPath = resolve(process.cwd(), process.env.NEOT_DATABASE_PATH ?? 'apps/neot/.local/neot.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const repository = new SqliteNeotRepository(dbPath);
if (process.env.NEOT_DEMO !== 'false') {
  repository.seedIfEmpty();
}

const cloudClient = new NeotCloudClient(process.env.NEOT_CLOUD_URL);
const studyService = new StudyService(repository);
const assessmentService = new AssessmentService(repository);
const syncService = new NeotSyncService(repository, cloudClient);
const router = new NeotRouter(studyService, assessmentService, syncService);

const apiToken = process.env.NEOT_API_TOKEN ?? 'neot_dev_token_secret_123';
const sessions = new Map();

export const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');

  const origin = request.headers.origin;
  if (origin && ['http://127.0.0.1:5250', 'http://localhost:5250', 'http://127.0.0.1:5173', 'http://localhost:5173', 'tauri://localhost', 'http://tauri.localhost'].includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Actor-Email');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Vary', 'Origin');
  }

  const send = (status, payload) => {
    response.writeHead(status);
    response.end(JSON.stringify(payload));
  };

  if (request.method === 'OPTIONS') return send(204, {});

  // Health endpoint
  if (request.url === '/health' && request.method === 'GET') {
    return send(200, { status: 'ok', service: 'neot-api', time: new Date().toISOString() });
  }

  // Auth endpoint (PIN / token session)
  if (request.url === '/api/v1/neot/auth' && request.method === 'POST') {
    try {
      const body = await readJsonBody(request);
      const email = body?.email?.trim() || 'student@neot.in';
      const role = body?.role === 'master' ? 'master' : 'student';
      const sessionToken = randomUUID();
      sessions.set(sessionToken, { email, role, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return send(200, { access_token: sessionToken, email, role, expires_in: 86400 });
    } catch (err) {
      return send(400, { error: err instanceof Error ? err.message : 'Invalid auth body' });
    }
  }

  // Check authorization
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace(/^Bearer /u, '');
  let actor = { email: request.headers['x-actor-email'] ?? 'student@neot.in', role: 'student' };

  if (token) {
    if (token === apiToken) {
      actor = { email: 'admin@neot.in', role: 'master' };
    } else {
      const session = sessions.get(token);
      if (session && session.expiresAt > Date.now()) {
        actor = { email: session.email, role: session.role };
      }
    }
  }

  const urlPrefix = '/api/v1/neot';
  if (!request.url?.startsWith(urlPrefix)) {
    return send(404, { error: 'Not found' });
  }

  const subPath = request.url.slice(urlPrefix.length).split('?')[0];

  try {
    let body = null;
    if (['POST', 'PUT'].includes(request.method ?? '')) {
      body = await readJsonBody(request);
    }
    const result = await router.dispatch(request.method ?? 'GET', subPath, body, actor);
    send(result.status, result.data);
  } catch (err) {
    const status = (err && typeof err === 'object' && err.code === 'NOT_FOUND') ? 404 : 400;
    send(status, { error: err instanceof Error ? err.message : 'Request failed' });
  }
});

async function readJsonBody(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error('Payload too large');
  }
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

if (process.argv[1]?.endsWith('server.mjs')) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`[NEOT API] Running at http://127.0.0.1:${port}`);
    console.log(`[NEOT API] Database path: ${dbPath}`);
  });
}
