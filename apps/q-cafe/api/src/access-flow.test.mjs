import assert from 'node:assert/strict';
import test from 'node:test';
import { CafeStore } from './store.mjs';

test('built-in PIN roles, master data, special pricing, parcel billing, and audit logs work together', () => {
  const store = new CafeStore(':memory:');
  assert.deepEqual(store.signInPin('1234').role, 'cashier');
  assert.deepEqual(store.signInPin('4563').role, 'manager');
  assert.deepEqual(store.signInPin('7575').login, 'owner');
  assert.deepEqual(store.signInPin('9696').login, 'super-admin');

  const category = store.saveCategory({ code: 'BF', name: 'Breakfast' });
  store.saveMasterSetting({ key: 'today_special_enabled', value: 'true' });
  store.saveMasterSetting({ key: 'today_special_definitions', value: JSON.stringify([{ id: 'sunday-special', prefix: 'SS', name: 'Sunday Special', isEnabled: true }]) });
  store.saveItem({
    category_id: category.id,
    code: 'IDLI',
    name: 'Idli',
    normal_price: 15000,
    specials: [{ prefix: 'SS', name: 'Sunday Special', price: 10000, is_enabled: true }],
  });
  const item = store.snapshot().menu[0];
  assert.match(item.specials, /Sunday Special/);
  assert.throws(() => store.saveItem({ category_id: category.id, code: 'OUTSIDE', name: 'Outside image', normal_price: 10000, image_path: 'C:\\outside.jpg', specials: [] }), /image folder/);

  const bill = store.createPos({
    table_no: 'Parcel',
    guest_count: 1,
    gst_percent: 0,
    lines: [{ menu_id: item.id, item_code: item.code, item_name: item.name, quantity: 1, rate: item.price }],
  });
  assert.equal(bill.table_id, null);
  assert.equal(bill.table_no, 'Takeaway');
  store.recordReceipt({
    pos_id: bill.id,
    transactions: [{ transaction_mode: 'cash', settlement_nature: 'collection', amount: item.price }],
  });
  const snapshot = store.snapshot();
  assert.equal(snapshot.pos[0].status, 'paid');
  assert.equal(snapshot.staff_auth_events.filter(event => event.event_type === 'login').length, 4);
  store.db.close();
});

test('managers can prepare a disabled item special before it becomes the active POS special', () => {
  const store = new CafeStore(':memory:');
  const category = store.saveCategory({ code: 'BF', name: 'Breakfast' });
  store.saveMasterSetting({
    key: 'today_special_definitions',
    value: JSON.stringify([{ id: 'pooja-special', prefix: 'PS', name: 'Pooja Special', isEnabled: false }]),
  });

  store.saveItem({
    category_id: category.id,
    code: 'IDLI',
    name: 'Idli',
    normal_price: 15000,
    specials: [{ prefix: 'PS', price: 8000, is_enabled: false }],
  });

  assert.match(store.snapshot().menu[0].specials, /Pooja Special/);
  assert.match(store.snapshot().menu[0].specials, /"is_enabled":0/);
  store.db.close();
});
