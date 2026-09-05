import { createHash, randomBytes, randomUUID } from "node:crypto";

export class DeviceRegistry {
  constructor(database, bootstrap = []) {
    this.db = database;
    this.db.exec(`CREATE TABLE IF NOT EXISTS dcs_devices (
      id TEXT PRIMARY KEY, scope TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen TEXT, revoked_at TEXT);
      CREATE TABLE IF NOT EXISTS dcs_tickets (hash TEXT PRIMARY KEY, device_id TEXT NOT NULL, expires INTEGER NOT NULL);`);
    for (const device of bootstrap) this.db.prepare("INSERT OR IGNORE INTO dcs_devices(id,scope,name,kind,token_hash,created_at,revoked_at) VALUES(?,?,?,?,?,?,?)")
      .run(device.id, device.scope, device.id, "desktop", device.tokenHash, new Date().toISOString(), device.revoked ? new Date().toISOString() : null);
  }

  enroll(scope, input) {
    if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 80 || !["desktop", "android", "ios", "web"].includes(input.kind)) throw new Error("Invalid device name or kind");
    const id = randomUUID();
    const token = randomBytes(32).toString("base64url");
    this.db.prepare("INSERT INTO dcs_devices(id,scope,name,kind,token_hash,created_at) VALUES(?,?,?,?,?,?)")
      .run(id, scope, input.name.trim(), input.kind, digest(token), new Date().toISOString());
    return { deviceId: id, token, kind: input.kind, name: input.name.trim() };
  }

  list(scope) {
    return this.db.prepare("SELECT id,name,kind,created_at AS createdAt,last_seen AS lastSeen,revoked_at AS revokedAt FROM dcs_devices WHERE scope=? ORDER BY created_at").all(scope);
  }

  authenticate(header) {
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return undefined;
    return this.db.prepare("SELECT id,scope FROM dcs_devices WHERE token_hash=? AND revoked_at IS NULL").get(digest(token));
  }

  isActive(id) { return !!this.db.prepare("SELECT id FROM dcs_devices WHERE id=? AND revoked_at IS NULL").get(id); }
  seen(id) { this.db.prepare("UPDATE dcs_devices SET last_seen=? WHERE id=?").run(new Date().toISOString(), id); }
  revoke(scope, id) { this.db.prepare("UPDATE dcs_devices SET revoked_at=? WHERE scope=? AND id=?").run(new Date().toISOString(), scope, id); }

  ticket(deviceId) {
    const ticket = randomBytes(32).toString("base64url");
    this.db.prepare("DELETE FROM dcs_tickets WHERE expires<?").run(Date.now());
    this.db.prepare("INSERT INTO dcs_tickets(hash,device_id,expires) VALUES(?,?,?)").run(digest(ticket), deviceId, Date.now() + 30000);
    return { ticket, expiresIn: 30 };
  }

  consumeTicket(ticket) {
    if (!ticket) return undefined;
    const row = this.db.prepare("DELETE FROM dcs_tickets WHERE hash=? RETURNING device_id,expires").get(digest(ticket));
    if (!row || row.expires < Date.now()) return undefined;
    return this.db.prepare("SELECT id,scope FROM dcs_devices WHERE id=? AND revoked_at IS NULL").get(row.device_id);
  }
}

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
