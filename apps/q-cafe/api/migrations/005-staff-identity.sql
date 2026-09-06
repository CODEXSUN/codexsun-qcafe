CREATE TABLE staff_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_identity_account_id TEXT,
  name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('owner','manager','cashier','waiter','kitchen')),
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending','synced','failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);
CREATE TABLE staff_auth_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_user_id INTEGER REFERENCES staff_users(id),
  event_type TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX staff_users_login ON staff_users(login);
CREATE INDEX staff_auth_events_staff ON staff_auth_events(staff_user_id, created_at DESC);
CREATE UNIQUE INDEX staff_users_sync_id ON staff_users(sync_id);
CREATE TRIGGER staff_users_sync_after_insert AFTER INSERT ON staff_users WHEN NEW.sync_id IS NULL BEGIN UPDATE staff_users SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER staff_users_sync_after_update AFTER UPDATE ON staff_users WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE staff_users SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
