CREATE TABLE restaurant_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT NOT NULL UNIQUE,
  chair_count INTEGER NOT NULL CHECK(chair_count BETWEEN 1 AND 24),
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'offline')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

CREATE TABLE pos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_no TEXT NOT NULL UNIQUE,
  table_id INTEGER REFERENCES restaurant_tables(id),
  table_no TEXT NOT NULL,
  table_chairs INTEGER NOT NULL CHECK(table_chairs BETWEEN 0 AND 24),
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK(guest_count BETWEEN 1 AND 24),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'part-paid', 'paid', 'void')),
  taxable_amount INTEGER NOT NULL CHECK(taxable_amount >= 0),
  gst_percent REAL NOT NULL DEFAULT 0 CHECK(gst_percent BETWEEN 0 AND 100),
  gst_amount INTEGER NOT NULL DEFAULT 0 CHECK(gst_amount >= 0),
  grand_total INTEGER NOT NULL CHECK(grand_total >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

CREATE TABLE pos_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pos_id INTEGER NOT NULL REFERENCES pos(id),
  menu_id INTEGER REFERENCES menu(id),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  rate INTEGER NOT NULL CHECK(rate > 0),
  amount INTEGER NOT NULL CHECK(amount > 0),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT NOT NULL UNIQUE,
  pos_id INTEGER NOT NULL REFERENCES pos(id),
  pos_amount INTEGER NOT NULL CHECK(pos_amount >= 0),
  receipt_amount INTEGER NOT NULL CHECK(receipt_amount > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

CREATE TABLE receipt_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id),
  transaction_mode TEXT NOT NULL CHECK(transaction_mode IN ('cash', 'card', 'upi', 'bank', 'other')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  denominations TEXT,
  settlement_nature TEXT NOT NULL CHECK(settlement_nature IN ('collection', 'advance', 'refund', 'adjustment')),
  reference_no TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_updated_at TEXT
);

CREATE INDEX pos_table_created_at ON pos(table_id, created_at DESC);
CREATE INDEX pos_items_pos_id ON pos_items(pos_id);
CREATE INDEX receipts_pos_id ON receipts(pos_id);
CREATE INDEX receipt_transactions_receipt_id ON receipt_transactions(receipt_id);

CREATE UNIQUE INDEX restaurant_tables_sync_id ON restaurant_tables(sync_id);
CREATE UNIQUE INDEX pos_sync_id ON pos(sync_id);
CREATE UNIQUE INDEX pos_items_sync_id ON pos_items(sync_id);
CREATE UNIQUE INDEX receipts_sync_id ON receipts(sync_id);
CREATE UNIQUE INDEX receipt_transactions_sync_id ON receipt_transactions(sync_id);

CREATE TRIGGER restaurant_tables_sync_after_insert AFTER INSERT ON restaurant_tables WHEN NEW.sync_id IS NULL BEGIN UPDATE restaurant_tables SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER pos_sync_after_insert AFTER INSERT ON pos WHEN NEW.sync_id IS NULL BEGIN UPDATE pos SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER pos_items_sync_after_insert AFTER INSERT ON pos_items WHEN NEW.sync_id IS NULL BEGIN UPDATE pos_items SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER receipts_sync_after_insert AFTER INSERT ON receipts WHEN NEW.sync_id IS NULL BEGIN UPDATE receipts SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER receipt_transactions_sync_after_insert AFTER INSERT ON receipt_transactions WHEN NEW.sync_id IS NULL BEGIN UPDATE receipt_transactions SET sync_id=lower(hex(randomblob(16))), sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;

CREATE TRIGGER restaurant_tables_sync_after_update AFTER UPDATE ON restaurant_tables WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE restaurant_tables SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER pos_sync_after_update AFTER UPDATE ON pos WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE pos SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER pos_items_sync_after_update AFTER UPDATE ON pos_items WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE pos_items SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER receipts_sync_after_update AFTER UPDATE ON receipts WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE receipts SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
CREATE TRIGGER receipt_transactions_sync_after_update AFTER UPDATE ON receipt_transactions WHEN NEW.sync_id=OLD.sync_id BEGIN UPDATE receipt_transactions SET sync_status='pending', sync_version=OLD.sync_version+1, sync_updated_at=datetime('now') WHERE rowid=NEW.rowid; END;
