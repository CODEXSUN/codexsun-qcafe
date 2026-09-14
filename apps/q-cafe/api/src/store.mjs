import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { hashPin, verifyPin, validatePin } from './staff-auth.mjs';

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
    const tables = ['restaurant_tables', 'pos', 'pos_items', 'receipts', 'receipt_transactions', 'orders', 'order_lines', 'inventory', 'bookings', 'activities', 'staff_users', 'staff_auth_events'];
    return {
      menu: this.db.prepare(`SELECT i.id,i.code,i.name,c.name AS category,i.normal_price AS price,i.image_path,
        COALESCE(json_group_array(json_object('id',s.id,'code',s.code,'prefix',s.prefix,'name',s.name,'price',sp.price,'is_enabled',s.is_enabled))
        FILTER (WHERE s.id IS NOT NULL),'[]') AS specials
        FROM items i JOIN categories c ON c.id=i.category_id
        LEFT JOIN item_special s ON s.item_id=i.id LEFT JOIN item_special_price sp ON sp.item_special_id=s.id
        WHERE i.is_active=1 AND c.is_active=1 GROUP BY i.id ORDER BY c.name,i.code`).all(),
      categories: this.db.prepare('SELECT * FROM categories WHERE is_active=1 ORDER BY name').all(),
      master_settings: this.db.prepare('SELECT * FROM master_settings ORDER BY key').all(),
      ...Object.fromEntries(tables.map(table => [table, this.db.prepare(`SELECT * FROM ${table}`).all()])),
    };
  }
  saveCategory(input) {
    const code = shortLabel(input.code, 40);
    const name = label(input.name);
    if (input.id) {
      this.db.prepare("UPDATE categories SET code=?,name=?,updated_at=datetime('now') WHERE id=?").run(code, name, wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Category id'));
      return { id: Number(input.id) };
    }
    const result = this.db.prepare('INSERT INTO categories(code,name) VALUES (?,?)').run(code, name);
    return { id: Number(result.lastInsertRowid) };
  }
  deleteCategory(input) {
    const id = wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Category id');
    if (this.db.prepare('SELECT id FROM items WHERE category_id=? LIMIT 1').get(id)) throw new Error('Move or delete the category items first.');
    this.db.prepare('DELETE FROM categories WHERE id=?').run(id);
  }
  saveItem(input) {
    const categoryId = wholeNumber(input.category_id, 1, Number.MAX_SAFE_INTEGER, 'Category');
    if (!this.db.prepare('SELECT id FROM categories WHERE id=? AND is_active=1').get(categoryId)) throw new Error('Choose an active category.');
    const code = shortLabel(input.code, 40);
    const name = label(input.name);
    const price = wholeNumber(input.normal_price, 1, 100_000_000, 'Normal price');
    const specials = Array.isArray(input.specials) ? input.specials : [];
    const configuredSpecials = this.configuredTodaySpecials();
    return this.transaction(() => {
      const itemId = input.id
        ? (this.db.prepare("UPDATE items SET category_id=?,code=?,name=?,normal_price=?,image_path=?,updated_at=datetime('now') WHERE id=?").run(categoryId, code, name, price, optionalImageName(input.image_path), wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Item id')), Number(input.id))
        : Number(this.db.prepare('INSERT INTO items(category_id,code,name,normal_price,image_path) VALUES (?,?,?,?,?)').run(categoryId, code, name, price, optionalImageName(input.image_path)).lastInsertRowid);
      this.db.prepare('DELETE FROM item_special WHERE item_id=?').run(itemId);
      for (const special of specials) {
        const prefix = shortLabel(special.prefix, 20).toUpperCase();
        const specialName = configuredSpecials.get(prefix);
        if (!specialName) throw new Error(`Configure Today Special ${prefix} before adding its price.`);
        const specialPrice = wholeNumber(special.price, 1, 100_000_000, 'Special price');
        const result = this.db.prepare('INSERT INTO item_special(item_id,code,prefix,name,is_enabled,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(itemId, prefix, prefix, specialName, special.is_enabled === false ? 0 : 1, optionalLabel(special.starts_on, 32), optionalLabel(special.ends_on, 32));
        this.db.prepare('INSERT INTO item_special_price(item_special_id,price) VALUES (?,?)').run(result.lastInsertRowid, specialPrice);
      }
      return { id: itemId };
    });
  }
  deleteItem(input) {
    this.db.prepare('DELETE FROM items WHERE id=?').run(wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Item id'));
  }
  saveRestaurantTable(input) {
    const tableNo = restaurantTableNumber(input.table_no);
    const chairCount = wholeNumber(input.chair_count, 1, 24, 'Chair count');
    if (input.id) {
      const id = wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Restaurant table id');
      this.db.prepare('UPDATE restaurant_tables SET table_no=?,chair_count=? WHERE id=?').run(tableNo, chairCount, id);
      return { id };
    }
    const result = this.db.prepare('INSERT INTO restaurant_tables(table_no,chair_count) VALUES (?,?)').run(tableNo, chairCount);
    return { id: Number(result.lastInsertRowid) };
  }
  deleteRestaurantTable(input) {
    const id = wholeNumber(input.id, 1, Number.MAX_SAFE_INTEGER, 'Restaurant table id');
    if (this.db.prepare('SELECT id FROM pos WHERE table_id=? LIMIT 1').get(id)) throw new Error('This table has bills and cannot be deleted. Mark it offline instead.');
    this.db.prepare('DELETE FROM restaurant_tables WHERE id=?').run(id);
  }
  saveMasterSetting(input) {
    const key = shortLabel(input.key, 80); const value = String(input.value ?? '');
    if (key === 'today_special_definitions') validateTodaySpecialDefinitions(value);
    this.db.prepare("INSERT INTO master_settings(key,value,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(key, value);
  }
  enabledTodaySpecials() {
    const enabled = this.db.prepare("SELECT value FROM master_settings WHERE key='today_special_enabled'").get()?.value === 'true';
    if (!enabled) return new Map();
    const value = this.db.prepare("SELECT value FROM master_settings WHERE key='today_special_definitions'").get()?.value;
    return new Map(readTodaySpecialDefinitions(value).filter((special) => special.isEnabled).map((special) => [special.prefix, special.name]));
  }
  configuredTodaySpecials() {
    const value = this.db.prepare("SELECT value FROM master_settings WHERE key='today_special_definitions'").get()?.value;
    return new Map(readTodaySpecialDefinitions(value).map((special) => [special.prefix, special.name]));
  }
  hasStaffUsers() { return Boolean(this.db.prepare('SELECT id FROM staff_users LIMIT 1').get()); }
  ensureBuiltInStaff() {
    const accounts = [
      ['cashier', 'Cashier', 'cashier', '1234'],
      ['manager', 'Manager', 'manager', '4563'],
      ['owner', 'Owner', 'owner', '7575'],
      ['super-admin', 'Super admin', 'owner', '9696'],
    ];
    for (const [login, name, role, pin] of accounts) {
      if (!this.db.prepare('SELECT id FROM staff_users WHERE login=?').get(login)) {
        const result = this.db.prepare('INSERT INTO staff_users(name,login,role,pin_hash) VALUES (?,?,?,?)').run(name, login, role, hashPin(pin));
        this.authEvent(result.lastInsertRowid, 'role-provisioned', name + ' local role provisioned.');
      }
    }
  }
  signInPin(pin) {
    this.ensureBuiltInStaff();
    const login = ({ '1234': 'cashier', '4563': 'manager', '7575': 'owner', '9696': 'super-admin' })[String(pin ?? '')];
    if (!login) throw new Error('Incorrect PIN.');
    return this.signInStaff(login, pin);
  }
  bootstrapOwner(pin) {
    if (this.hasStaffUsers()) return;
    validatePin(pin);
    this.db.prepare("INSERT INTO staff_users(name,login,role,pin_hash) VALUES ('Q Cafe owner','owner','owner',?)").run(hashPin(pin));
    this.authEvent(null, 'owner-bootstrap', 'Local owner created.');
  }
  signInStaff(login, pin) {
    const staff = this.db.prepare('SELECT * FROM staff_users WHERE login=? COLLATE NOCASE').get(String(login ?? 'cashier').trim());
    if (!staff || staff.status !== 'active') throw new Error('Incorrect username or PIN.');
    if (staff.locked_until && Date.parse(staff.locked_until) > Date.now()) throw new Error('This user is temporarily locked. Ask a manager to reset the PIN.');
    if (!verifyPin(pin, staff.pin_hash)) {
      const failures = staff.failed_attempts + 1;
      const lockedUntil = failures >= 5 ? new Date(Date.now() + 30_000).toISOString() : null;
      this.db.prepare('UPDATE staff_users SET failed_attempts=?,locked_until=?,updated_at=datetime(\'now\') WHERE id=?').run(failures, lockedUntil, staff.id);
      this.authEvent(staff.id, 'login-failed', 'Incorrect PIN.');
      throw new Error(lockedUntil ? 'Too many attempts. Try again shortly.' : 'Incorrect username or PIN.');
    }
    this.db.prepare('UPDATE staff_users SET failed_attempts=0,locked_until=NULL,last_login_at=datetime(\'now\'),updated_at=datetime(\'now\') WHERE id=?').run(staff.id);
    this.authEvent(staff.id, 'login', staff.name + ' signed in as ' + staff.role + '.');
    return { id: staff.id, login: staff.login, name: staff.name, role: staff.role };
  }
  setupOwner(input) {
    if (this.hasStaffUsers()) throw new Error('Q Cafe owner setup is already complete.');
    const login = shortLabel(input.login ?? 'owner', 60).toLowerCase();
    const name = label(input.name ?? 'Q Cafe owner');
    validatePin(input.pin);
    const result = this.db.prepare("INSERT INTO staff_users(name,login,role,pin_hash,platform_identity_account_id) VALUES (?,?, 'owner', ?, ?)").run(name, login, hashPin(input.pin), optionalLabel(input.platform_identity_account_id, 120));
    this.authEvent(result.lastInsertRowid, 'owner-setup', 'Owner PIN configured.');
    return { id: Number(result.lastInsertRowid), login, name, role: 'owner' };
  }
  authEvent(staffUserId, eventType, detail) { this.db.prepare('INSERT INTO staff_auth_events(staff_user_id,event_type,detail) VALUES (?,?,?)').run(staffUserId, eventType, detail); }
  pendingSync() {
    const tables = ['menu', 'restaurant_tables', 'pos', 'pos_items', 'receipts', 'receipt_transactions', 'orders', 'order_lines', 'inventory', 'stock_movements', 'bookings', 'activities'];
    return Object.fromEntries(tables.map(table => [table, this.db.prepare(`SELECT * FROM ${table} WHERE sync_status='pending' ORDER BY sync_updated_at`).all()]));
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
        if (typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 99 || decimalPlaces(line.quantity) > 3) throw new Error('Invalid quantity.');
        if (!Number.isInteger(line.price) || line.price < 1 || line.price > 100_000_000) throw new Error('Invalid rate.');
        return { id: item?.id ?? null, item_code: shortLabel(line.item_code, 40), name: label(line.name), price: line.price, quantity: line.quantity };
      });
      const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const { lastInsertRowid } = this.db.prepare('INSERT INTO orders(table_name,total) VALUES (?,?)').run(table, total);
      for (const line of lines) this.db.prepare('INSERT INTO order_lines(order_id,menu_id,item_code,name,quantity,price) VALUES (?,?,?,?,?,?)').run(lastInsertRowid, line.id, line.item_code, line.name, line.quantity, line.price);
      this.activity('order', lastInsertRowid, 'created', `Order created for ${table} with ${lines.length} line${lines.length === 1 ? '' : 's'}.`);
      return { id: Number(lastInsertRowid), total };
    });
  }
  createPos(input) {
    if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 100) throw new Error('Choose between 1 and 100 POS items.');
    const gstPercent = taxPercent(input.gst_percent);
    const table = this.posTable(input.table_id, input.table_no);
    const guestCount = wholeNumber(input.guest_count ?? 1, 1, Math.max(table.chairs, 1), 'Guest count');
    return this.transaction(() => {
      const lines = input.lines.map(line => this.posLine(line));
      const taxableAmount = lines.reduce((sum, line) => sum + line.amount, 0);
      const gstAmount = Math.round(taxableAmount * gstPercent / 100);
      const grandTotal = taxableAmount + gstAmount;
      const billNo = this.nextPosBillNumber();
      const bill = this.db.prepare('INSERT INTO pos(bill_no,table_id,table_no,table_chairs,guest_count,taxable_amount,gst_percent,gst_amount,grand_total) VALUES (?,?,?,?,?,?,?,?,?)').run(billNo, table.id, table.no, table.chairs, guestCount, taxableAmount, gstPercent, gstAmount, grandTotal);
      for (const line of lines) this.db.prepare('INSERT INTO pos_items(pos_id,menu_id,item_code,item_name,quantity,rate,amount) VALUES (?,?,?,?,?,?,?)').run(bill.lastInsertRowid, line.menuId, line.code, line.name, line.quantity, line.rate, line.amount);
      if (table.id) this.db.prepare("UPDATE restaurant_tables SET status='occupied' WHERE id=?").run(table.id);
      this.activity('pos', bill.lastInsertRowid, 'created', `POS bill ${billNo} created for ${table.no} with ${lines.length} item${lines.length === 1 ? '' : 's'}.`);
      return this.db.prepare('SELECT * FROM pos WHERE id=?').get(bill.lastInsertRowid);
    });
  }
  recordReceipt(input) {
    const posId = wholeNumber(input.pos_id, 1, Number.MAX_SAFE_INTEGER, 'POS id');
    if (!Array.isArray(input.transactions) || input.transactions.length < 1 || input.transactions.length > 10) throw new Error('Add between 1 and 10 payment transactions.');
    return this.transaction(() => {
      const pos = this.db.prepare('SELECT * FROM pos WHERE id=?').get(posId);
      if (!pos || pos.status === 'void') throw new Error('POS bill is unavailable for payment.');
      const transactions = input.transactions.map(transaction => this.receiptTransaction(transaction));
      const receiptAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const paid = this.db.prepare('SELECT COALESCE(SUM(receipt_amount),0) AS amount FROM receipts WHERE pos_id=?').get(posId).amount;
      if (receiptAmount > pos.grand_total - paid) throw new Error('Payment exceeds the outstanding amount.');
      const receiptNo = this.nextDocumentNumber('receipts', 'receipt_no', 'RCT');
      const receipt = this.db.prepare('INSERT INTO receipts(receipt_no,pos_id,pos_amount,receipt_amount) VALUES (?,?,?,?)').run(receiptNo, posId, pos.grand_total, receiptAmount);
      for (const transaction of transactions) this.db.prepare('INSERT INTO receipt_transactions(receipt_id,transaction_mode,amount,denominations,settlement_nature,reference_no) VALUES (?,?,?,?,?,?)').run(receipt.lastInsertRowid, transaction.mode, transaction.amount, transaction.denominations, transaction.nature, transaction.reference);
      const totalPaid = paid + receiptAmount;
      const status = totalPaid === pos.grand_total ? 'paid' : 'part-paid';
      this.db.prepare('UPDATE pos SET status=? WHERE id=?').run(status, posId);
      if (status === 'paid' && pos.table_id) this.db.prepare("UPDATE restaurant_tables SET status='available' WHERE id=?").run(pos.table_id);
      this.activity('receipt', receipt.lastInsertRowid, 'created', `Receipt ${receiptNo} recorded against ${pos.bill_no}.`);
      return this.db.prepare('SELECT * FROM receipts WHERE id=?').get(receipt.lastInsertRowid);
    });
  }
  advance(input) {
    const previous = { preparing: 'queued', ready: 'preparing', served: 'ready' }[input.status];
    if (!previous) throw new Error('Invalid kitchen status.');
    this.transaction(() => {
      const result = this.db.prepare('UPDATE orders SET status=? WHERE id=? AND status=?').run(input.status, Number(input.id), previous);
      if (!result.changes) throw new Error('Ticket changed or transition is invalid. Refresh the kitchen.');
      this.activity('order', input.id, 'kitchen-status', `Order moved to ${input.status}.`);
    });
  }
  adjust(input) {
    if (typeof input.delta !== 'number' || !Number.isFinite(input.delta) || !input.delta || Math.abs(input.delta) > 100000) throw new Error('Enter a valid stock adjustment.');
    const reason = label(input.reason);
    this.transaction(() => {
      const result = this.db.prepare('UPDATE inventory SET quantity=quantity+? WHERE id=? AND quantity+? >= 0').run(input.delta, Number(input.id), input.delta);
      if (!result.changes) throw new Error('Item is missing or stock would become negative.');
      const movement = this.db.prepare('INSERT INTO stock_movements(inventory_id,delta,reason) VALUES (?,?,?)').run(Number(input.id), input.delta, reason);
      this.activity('inventory', input.id, 'adjusted', `Stock changed by ${input.delta}; ${reason}.`);
      this.activity('stock_movement', movement.lastInsertRowid, 'created', `Stock movement recorded for inventory ${input.id}.`);
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
      const booking = this.db.prepare('INSERT INTO bookings(guest,guests,table_name,starts_at) VALUES (?,?,?,?)').run(guest,input.guests,table,date.toISOString());
      this.activity('booking', booking.lastInsertRowid, 'created', `Booking created for ${guest} at ${table}.`);
    });
  }
  activity(entityType, entityId, action, detail) {
    this.db.prepare('INSERT INTO activities(entity_type,entity_id,action,detail) VALUES (?,?,?,?)').run(entityType, String(entityId), action, detail);
  }
  posTable(tableId, tableNo) {
    if (tableNo === 'Takeaway' || tableNo === 'Parcel') return { id: null, no: 'Takeaway', chairs: 0 };
    const id = wholeNumber(tableId, 1, Number.MAX_SAFE_INTEGER, 'Table');
    const table = this.db.prepare('SELECT id,table_no,chair_count FROM restaurant_tables WHERE id=? AND status != ?').get(id, 'offline');
    if (!table) throw new Error('Choose an available restaurant table.');
    return { id: table.id, no: table.table_no, chairs: table.chair_count };
  }
  posLine(line) {
    if (!line || typeof line !== 'object') throw new Error('Invalid POS item.');
    const code = shortLabel(line.item_code, 40);
    const name = label(line.item_name);
    const quantity = decimalNumber(line.quantity, 0.001, 99, 3, 'Quantity');
    const rate = wholeNumber(line.rate, 1, 100_000_000, 'Rate');
    // POS lines retain their item code, name, and rate as an immutable receipt
    // snapshot. The legacy menu_id foreign key is null for new items, which are
    // owned by the items table.
    return { menuId: null, code, name, quantity, rate, amount: Math.round(quantity * rate) };
  }
  receiptTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') throw new Error('Invalid payment transaction.');
    const mode = ['cash', 'card', 'upi', 'bank', 'other'].includes(transaction.transaction_mode) ? transaction.transaction_mode : null;
    const nature = ['collection', 'advance', 'refund', 'adjustment'].includes(transaction.settlement_nature) ? transaction.settlement_nature : null;
    if (!mode || !nature) throw new Error('Choose a payment mode and settlement nature.');
    const denominations = optionalLabel(transaction.denominations, 400);
    const reference = optionalLabel(transaction.reference_no, 120);
    return { mode, nature, denominations, reference, amount: wholeNumber(transaction.amount, 1, 100_000_000, 'Payment amount') };
  }
  nextDocumentNumber(table, column, prefix) {
    const value = this.db.prepare(`SELECT COALESCE(MAX(CAST(SUBSTR(${column}, ?) AS INTEGER)),0)+1 AS next FROM ${table}`).get(prefix.length + 2).next;
    return `${prefix}-${String(value).padStart(6, '0')}`;
  }
  nextPosBillNumber() {
    return String(this.db.prepare('SELECT COALESCE(MAX(id),0)+1 AS next FROM pos').get().next);
  }
}
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new Error('Enter text between 1 and 120 characters.');
  return value.trim();
}
function shortLabel(value, maximum) {
  const result = label(value);
  if (result.length > maximum) throw new Error(`Text must not exceed ${maximum} characters.`);
  return result;
}
function tableName(value, takeaway = true) {
  if (!/^T(0[1-9]|1[0-2])$/.test(value) && !(takeaway && value === 'Takeaway')) throw new Error('Choose a table T01–T12.');
  return value;
}
function decimalPlaces(value) {
  const [, fraction = ''] = String(value).split('.');
  return fraction.length;
}
function decimalNumber(value, minimum, maximum, places, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || decimalPlaces(value) > places) throw new Error(`Invalid ${name.toLowerCase()}.`);
  return value;
}
function wholeNumber(value, minimum, maximum, name) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Invalid ${name.toLowerCase()}.`);
  return value;
}
function taxPercent(value) {
  return decimalNumber(value ?? 0, 0, 100, 2, 'GST percent');
}
function optionalLabel(value, maximum) {
  if (value === undefined || value === null || value === '') return null;
  return shortLabel(value, maximum);
}
function restaurantTableNumber(value) {
  const tableNo = shortLabel(value, 40).toUpperCase();
  if (!/^[A-Z][A-Z0-9 -]*$/u.test(tableNo)) throw new Error('Table name can use letters, numbers, spaces, and hyphens.');
  return tableNo;
}

function optionalImageName(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !isSafeImageName(value)) {
    throw new Error('Upload an image through Q Cafe. Image paths cannot point outside the Q Cafe image folder.');
  }
  return value;
}

function isSafeImageName(value) {
  return /^[^<>:"/\\|?*\x00-\x1f]{1,120}\.(?:jpe?g|png|webp)$/iu.test(value);
}

function readTodaySpecialDefinitions(value) {
  if (typeof value !== 'string') return [];
  try {
    const definitions = JSON.parse(value);
    if (!Array.isArray(definitions)) return [];
    return definitions.flatMap((definition) => {
      const prefix = typeof definition?.prefix === 'string' ? definition.prefix.trim().toUpperCase() : '';
      const name = typeof definition?.name === 'string' ? definition.name.trim() : '';
      return prefix && name ? [{ prefix, name, isEnabled: definition.isEnabled !== false }] : [];
    });
  } catch {
    return [];
  }
}

function validateTodaySpecialDefinitions(value) {
  const definitions = readTodaySpecialDefinitions(value);
  const source = JSON.parse(value);
  if (!Array.isArray(source) || definitions.length !== source.length) throw new Error('Today Special definitions must include a prefix and name.');
  const prefixes = new Set();
  for (const definition of definitions) {
    shortLabel(definition.prefix, 20);
    label(definition.name);
    if (prefixes.has(definition.prefix)) throw new Error('Today Special prefixes must be unique.');
    prefixes.add(definition.prefix);
  }
}
