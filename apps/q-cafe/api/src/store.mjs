import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';

export class CafeStore {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);');
    const directory = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
      if (this.db.prepare('SELECT name FROM migrations WHERE name=?').get(name)) continue;
      this.transaction(() => {
        this.db.exec(readFileSync(new URL(name, directory), 'utf8'));
        this.db.prepare('INSERT INTO migrations VALUES (?)').run(name);
      });
    }
  }
  snapshot() {
    return Object.fromEntries(['menu', 'orders', 'order_lines', 'inventory', 'bookings'].map(table => [table, this.db.prepare(`SELECT * FROM ${table}`).all()]));
  }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  order(input) {
    if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 100) throw new Error('Choose between 1 and 100 menu lines.');
    const table = tableName(input.table_name);
    return this.transaction(() => {
      const lines = input.lines.map(line => {
        const item = this.db.prepare('SELECT * FROM menu WHERE id=?').get(Number(line.menu_id));
        if (!item || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('Invalid menu item or quantity.');
        return { ...item, quantity: line.quantity };
      });
      const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const { lastInsertRowid } = this.db.prepare('INSERT INTO orders(table_name,total) VALUES (?,?)').run(table, total);
      for (const line of lines) this.db.prepare('INSERT INTO order_lines VALUES (?,?,?,?,?)').run(lastInsertRowid, line.id, line.name, line.quantity, line.price);
      return { id: Number(lastInsertRowid), total };
    });
  }
  advance(input) {
    const previous = { preparing: 'queued', ready: 'preparing', served: 'ready' }[input.status];
    if (!previous) throw new Error('Invalid kitchen status.');
    const result = this.db.prepare('UPDATE orders SET status=? WHERE id=? AND status=?').run(input.status, Number(input.id), previous);
    if (!result.changes) throw new Error('Ticket changed or transition is invalid. Refresh the kitchen.');
  }
  adjust(input) {
    if (typeof input.delta !== 'number' || !Number.isFinite(input.delta) || !input.delta || Math.abs(input.delta) > 100000) throw new Error('Enter a valid stock adjustment.');
    const reason = label(input.reason);
    this.transaction(() => {
      const result = this.db.prepare('UPDATE inventory SET quantity=quantity+? WHERE id=? AND quantity+? >= 0').run(input.delta, Number(input.id), input.delta);
      if (!result.changes) throw new Error('Item is missing or stock would become negative.');
      this.db.prepare('INSERT INTO stock_movements(inventory_id,delta,reason) VALUES (?,?,?)').run(Number(input.id), input.delta, reason);
    });
  }
  book(input) {
    const guest = label(input.guest);
    const table = tableName(input.table_name, false);
    if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 12) throw new Error('Party size must be 1–12.');
    const date = new Date(input.starts_at);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now()) throw new Error('Choose a future booking time.');
    this.transaction(() => {
      const conflict = this.db.prepare("SELECT id FROM bookings WHERE table_name=? AND status='confirmed' AND ABS(julianday(starts_at)-julianday(?))*24 < 2").get(table, date.toISOString());
      if (conflict) throw new Error('This table is reserved within two hours of that time.');
      this.db.prepare('INSERT INTO bookings(guest,guests,table_name,starts_at) VALUES (?,?,?,?)').run(guest,input.guests,table,date.toISOString());
    });
  }
  seed() {
    if (this.db.prepare('SELECT id FROM menu LIMIT 1').get()) return;
    this.transaction(() => {
      for (const row of [[1,'Filter coffee','Beverages',8000],[2,'Cappuccino','Beverages',14000],[3,'Iced latte','Beverages',16000],[4,'Masala chai','Beverages',6000],[5,'Paneer sandwich','Kitchen',18000],[6,'Pesto pasta','Kitchen',26000],[7,'Butter croissant','Bakery',12000],[8,'Chocolate brownie','Bakery',15000]]) this.db.prepare('INSERT INTO menu VALUES (?,?,?,?)').run(...row);
      for (const row of [[1,'Coffee beans','kg',4.5,2],[2,'Milk','litres',8,10],[3,'Paneer','kg',3,2],[4,'Croissants','pieces',18,12]]) this.db.prepare('INSERT INTO inventory VALUES (?,?,?,?,?)').run(...row);
    });
  }
}
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new Error('Enter text between 1 and 120 characters.');
  return value.trim();
}
function tableName(value, takeaway = true) {
  if (!/^T(0[1-9]|1[0-2])$/.test(value) && !(takeaway && value === 'Takeaway')) throw new Error('Choose a table T01–T12.');
  return value;
}
