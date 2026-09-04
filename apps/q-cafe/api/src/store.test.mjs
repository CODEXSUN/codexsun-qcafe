import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CafeStore } from './store.mjs';

test('editable order lines persist their item snapshot and kitchen transitions cannot skip states', () => {
  const store = new CafeStore(':memory:'); store.seed();
  const order = store.order({ table_name: 'T01', lines: [{ menu_id: 1, item_code: 'COF-1', name: 'House coffee', quantity: 1.5, price: 9500 }] });
  assert.equal(order.total, 14250);
  const { order_id, menu_id, item_code, name, quantity, price } = store.snapshot().order_lines[0];
  assert.deepEqual({ order_id, menu_id, item_code, name, quantity, price }, { order_id: 1, menu_id: 1, item_code: 'COF-1', name: 'House coffee', quantity: 1.5, price: 9500 });
  assert.throws(() => store.advance({ id: order.id, status: 'served' }));
  for (const status of ['preparing', 'ready', 'served']) store.advance({ id: order.id, status });
  assert.equal(store.snapshot().orders[0].status, 'served');
  assert.throws(() => store.order({ table_name: 'T01', lines: [{ item_code: '', name: 'Invalid', quantity: 1, price: 100 }] }));
  assert.equal(store.snapshot().orders.length, 1);
  assert.equal(store.snapshot().activities[0].action, 'created');
  assert.equal(store.snapshot().orders[0].sync_status, 'pending');
  assert.match(store.snapshot().orders[0].sync_id, /^[a-f0-9]{32}$/u);
  assert.equal(store.pendingSync().order_lines.length, 1);
  store.db.close();
});
test('stock cannot become negative and overlapping bookings are rejected', () => {
  const store = new CafeStore(':memory:'); store.seed();
  assert.throws(() => store.adjust({ id: 1, delta: -100, reason: 'Usage' }));
  assert.equal(store.snapshot().inventory[0].quantity, 4.5);
  const starts_at = new Date(Date.now() + 86400000).toISOString();
  store.book({ guest: 'Sample guest', guests: 2, table_name: 'T01', starts_at });
  assert.throws(() => store.book({ guest: 'Another guest', guests: 2, table_name: 'T01', starts_at }));
  store.db.close();
});
test('POS bills keep item, tax, table, receipt, and mixed-payment records separate', () => {
  const store = new CafeStore(':memory:'); store.seed();
  const table = store.snapshot().restaurant_tables[0];
  const bill = store.createPos({
    table_id: table.id,
    gst_percent: 5,
    lines: [
      { menu_id: 1, item_code: 'ITM-001', item_name: 'Filter coffee', quantity: 2, rate: 8000 },
      { menu_id: 2, item_code: 'ITM-002', item_name: 'Cappuccino', quantity: 1, rate: 14000 }
    ]
  });
  assert.deepEqual({ id: bill.id, bill_no: bill.bill_no, table_no: bill.table_no, table_chairs: bill.table_chairs, taxable_amount: bill.taxable_amount, gst_amount: bill.gst_amount, grand_total: bill.grand_total }, { id: 1, bill_no: 'POS-000001', table_no: 'T01', table_chairs: 4, taxable_amount: 30000, gst_amount: 1500, grand_total: 31500 });
  assert.equal(store.snapshot().pos_items.length, 2);
  assert.equal(store.snapshot().restaurant_tables[0].status, 'occupied');
  const receipt = store.recordReceipt({ pos_id: bill.id, transactions: [
    { transaction_mode: 'cash', amount: 15000, denominations: '₹500 × 30', settlement_nature: 'collection' },
    { transaction_mode: 'card', amount: 16500, reference_no: 'AUTH-123', settlement_nature: 'collection' }
  ] });
  assert.deepEqual({ receipt_no: receipt.receipt_no, pos_id: receipt.pos_id, pos_amount: receipt.pos_amount, receipt_amount: receipt.receipt_amount }, { receipt_no: 'RCT-000001', pos_id: 1, pos_amount: 31500, receipt_amount: 31500 });
  assert.equal(store.snapshot().receipt_transactions.length, 2);
  assert.equal(store.snapshot().pos[0].status, 'paid');
  assert.equal(store.snapshot().restaurant_tables[0].status, 'available');
  assert.equal(store.pendingSync().pos.length, 1);
  assert.throws(() => store.recordReceipt({ pos_id: bill.id, transactions: [{ transaction_mode: 'cash', amount: 1, settlement_nature: 'collection' }] }));
  store.db.close();
});
test('migrations are repeatable, databases isolated, and orders survive reopening', () => {
  const directory = mkdtempSync(join(tmpdir(), 'q-cafe-'));
  try {
    const path = join(directory, 'cafe.sqlite');
    const first = new CafeStore(path); first.seed(); first.order({ table_name: 'Takeaway', lines: [{ menu_id: 1, item_code: 'ITM-001', name: 'Filter coffee', quantity: 1, price: 8000 }] }); first.db.close();
    const second = new CafeStore(path); second.seed(); assert.equal(second.snapshot().orders.length, 1); assert.equal(second.snapshot().menu.length, 8); second.db.close();
    const isolated = new CafeStore(':memory:'); assert.equal(isolated.snapshot().orders.length, 0); isolated.db.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
