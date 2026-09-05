import { NEOT_DEFAULT_CLOUD_URL } from '../domain/sync.mjs';

export class NeotCloudClient {
  constructor(baseUrl = process.env.NEOT_CLOUD_URL ?? NEOT_DEFAULT_CLOUD_URL) {
    this.baseUrl = baseUrl;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'User-Agent': 'CODEXSUN-NEOT-Client/1.0' },
        signal: AbortSignal.timeout(5000),
      }).catch(async () => {
        return fetch(`${this.baseUrl}/`, {
          method: 'HEAD',
          headers: { 'User-Agent': 'CODEXSUN-NEOT-Client/1.0' },
          signal: AbortSignal.timeout(5000),
        });
      });

      return {
        ok: response.status >= 200 && response.status < 400,
        message: `HTTP ${response.status} from ${this.baseUrl}`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async fetchRemoteSnapshot(token) {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'CODEXSUN-NEOT-Client/1.0',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/sync/snapshot`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Remote returned status ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch remote snapshot from ${this.baseUrl}: ${msg}`);
    }
  }

  async publishLocalSnapshot(snapshot, token) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CODEXSUN-NEOT-Client/1.0',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}/api/v1/sync/snapshot`, {
      method: 'POST',
      headers,
      body: JSON.stringify(snapshot),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Remote publish failed with status ${response.status}`);
    }

    return await response.json();
  }
}
