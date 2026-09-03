import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CafeStore } from './store.mjs';

test('order prices are authoritative and kitchen transitions cannot skip states', () => {
  const store = new CafeStore(':memory:'); store.seed();
  const order = store.order({ table_name: 'T01', lines: [{ menu_id: 1, quantity: 2, price: 1 }] });
  assert.equal(order.total, 16000);
  assert.throws(() => store.advance({ id: order.id, status: 'served' }));
  for (const status of ['preparing', 'ready', 'served']) store.advance({ id: order.id, status });
  assert.equal(store.snapshot().orders[0].status, 'served');
  assert.throws(() => store.order({ table_name: 'T01', lines: [{ menu_id: 999, quantity: 1 }] }));
  assert.equal(store.snapshot().orders.length, 1);
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
test('migrations are repeatable, databases isolated, and orders survive reopening', () => {
  const directory = mkdtempSync(join(tmpdir(), 'q-cafe-'));
  try {
    const path = join(directory, 'cafe.sqlite');
    const first = new CafeStore(path); first.seed(); first.order({ table_name: 'Takeaway', lines: [{ menu_id: 1, quantity: 1 }] }); first.db.close();
    const second = new CafeStore(path); second.seed(); assert.equal(second.snapshot().orders.length, 1); assert.equal(second.snapshot().menu.length, 8); second.db.close();
    const isolated = new CafeStore(':memory:'); assert.equal(isolated.snapshot().orders.length, 0); isolated.db.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
