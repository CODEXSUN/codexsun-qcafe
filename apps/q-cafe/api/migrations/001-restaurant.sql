CREATE TABLE menu (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL CHECK(price > 0));
CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, table_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', total INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE order_lines (order_id INTEGER NOT NULL REFERENCES orders(id), menu_id INTEGER NOT NULL REFERENCES menu(id), name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0), price INTEGER NOT NULL);
CREATE TABLE inventory (id INTEGER PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, quantity REAL NOT NULL CHECK(quantity >= 0), minimum REAL NOT NULL);
CREATE TABLE stock_movements (id INTEGER PRIMARY KEY, inventory_id INTEGER NOT NULL REFERENCES inventory(id), delta REAL NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE bookings (id INTEGER PRIMARY KEY, guest TEXT NOT NULL, guests INTEGER NOT NULL CHECK(guests BETWEEN 1 AND 12), table_name TEXT NOT NULL, starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed');
CREATE UNIQUE INDEX booking_slot ON bookings(table_name, starts_at) WHERE status = 'confirmed';
