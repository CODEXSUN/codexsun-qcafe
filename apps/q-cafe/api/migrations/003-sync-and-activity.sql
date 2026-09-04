CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

ALTER TABLE menu ADD COLUMN sync_id TEXT;
ALTER TABLE menu ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE menu ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE menu ADD COLUMN sync_updated_at TEXT;
ALTER TABLE orders ADD COLUMN sync_id TEXT;
ALTER TABLE orders ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN sync_updated_at TEXT;
ALTER TABLE order_lines ADD COLUMN sync_id TEXT;
ALTER TABLE order_lines ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE order_lines ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE order_lines ADD COLUMN sync_updated_at TEXT;
ALTER TABLE inventory ADD COLUMN sync_id TEXT;
ALTER TABLE inventory ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE inventory ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD COLUMN sync_updated_at TEXT;
ALTER TABLE stock_movements ADD COLUMN sync_id TEXT;
ALTER TABLE stock_movements ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE stock_movements ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_movements ADD COLUMN sync_updated_at TEXT;
ALTER TABLE bookings ADD COLUMN sync_id TEXT;
ALTER TABLE bookings ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN sync_updated_at TEXT;

UPDATE menu SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE orders SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE order_lines SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE inventory SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE stock_movements SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE bookings SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;
UPDATE activities SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE sync_id IS NULL;

CREATE UNIQUE INDEX menu_sync_id ON menu(sync_id);
CREATE UNIQUE INDEX orders_sync_id ON orders(sync_id);
CREATE UNIQUE INDEX order_lines_sync_id ON order_lines(sync_id);
CREATE UNIQUE INDEX inventory_sync_id ON inventory(sync_id);
CREATE UNIQUE INDEX stock_movements_sync_id ON stock_movements(sync_id);
CREATE UNIQUE INDEX bookings_sync_id ON bookings(sync_id);
CREATE UNIQUE INDEX activities_sync_id ON activities(sync_id);

CREATE TRIGGER menu_sync_after_insert AFTER INSERT ON menu WHEN NEW.sync_id IS NULL BEGIN UPDATE menu SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER orders_sync_after_insert AFTER INSERT ON orders WHEN NEW.sync_id IS NULL BEGIN UPDATE orders SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER order_lines_sync_after_insert AFTER INSERT ON order_lines WHEN NEW.sync_id IS NULL BEGIN UPDATE order_lines SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER inventory_sync_after_insert AFTER INSERT ON inventory WHEN NEW.sync_id IS NULL BEGIN UPDATE inventory SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER stock_movements_sync_after_insert AFTER INSERT ON stock_movements WHEN NEW.sync_id IS NULL BEGIN UPDATE stock_movements SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER bookings_sync_after_insert AFTER INSERT ON bookings WHEN NEW.sync_id IS NULL BEGIN UPDATE bookings SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER activities_sync_after_insert AFTER INSERT ON activities WHEN NEW.sync_id IS NULL BEGIN UPDATE activities SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;

CREATE TRIGGER menu_sync_after_update AFTER UPDATE ON menu WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE menu SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER orders_sync_after_update AFTER UPDATE ON orders WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE orders SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER order_lines_sync_after_update AFTER UPDATE ON order_lines WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE order_lines SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER inventory_sync_after_update AFTER UPDATE ON inventory WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE inventory SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER stock_movements_sync_after_update AFTER UPDATE ON stock_movements WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE stock_movements SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER bookings_sync_after_update AFTER UPDATE ON bookings WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE bookings SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER activities_sync_after_update AFTER UPDATE ON activities WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE activities SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
