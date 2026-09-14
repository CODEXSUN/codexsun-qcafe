-- Q Cafe master data.  New installations start empty; existing menu rows are
-- copied once so a customer catalogue is never discarded by an upgrade.
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  normal_price INTEGER NOT NULL CHECK(normal_price > 0),
  image_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE item_special (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0,1)),
  starts_on TEXT,
  ends_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, prefix)
);

CREATE TABLE item_special_price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_special_id INTEGER NOT NULL REFERENCES item_special(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK(price > 0),
  effective_from TEXT,
  effective_to TEXT
  ,is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
  ,created_at TEXT NOT NULL DEFAULT (datetime('now'))
  ,updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE printer_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, printer_name TEXT, port_name TEXT, output_mode TEXT NOT NULL DEFAULT 'windows-driver', is_default INTEGER NOT NULL DEFAULT 1);
CREATE TABLE page_settings (page_key TEXT PRIMARY KEY, is_enabled INTEGER NOT NULL DEFAULT 1, settings_json TEXT NOT NULL DEFAULT '{}');
CREATE TABLE master_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));

INSERT OR IGNORE INTO categories(code,name)
SELECT lower(hex(randomblob(8))), category FROM menu GROUP BY category;
INSERT OR IGNORE INTO items(id,category_id,code,name,normal_price,is_active)
SELECT m.id,c.id,m.code,m.name,m.price,1
FROM menu m JOIN categories c ON c.name=m.category;

INSERT OR IGNORE INTO master_settings(key,value) VALUES ('today_special_enabled','false');

