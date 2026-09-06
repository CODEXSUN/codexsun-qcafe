import assert from 'node:assert/strict';
import test from 'node:test';
import { CafeStore } from './store.mjs';

test('creates a hashed owner PIN, records staff sign-in, and locks repeated failures', () => {
  const store = new CafeStore(':memory:');
  assert.equal(store.hasStaffUsers(), false);
  const owner = store.setupOwner({ name: 'Cafe owner', login: 'owner', pin: '2468', platform_identity_account_id: 'platform-owner-1' });
  assert.equal(store.hasStaffUsers(), true);
  assert.equal(store.db.prepare('SELECT pin_hash FROM staff_users WHERE id=?').get(owner.id).pin_hash.includes('2468'), false);
  assert.equal(store.signInStaff('owner', '2468').role, 'owner');
  for (let index = 0; index < 5; index += 1) assert.throws(() => store.signInStaff('owner', '0000'));
  assert.throws(() => store.signInStaff('owner', '2468'), /temporarily locked/);
  assert.ok(store.db.prepare("SELECT id FROM staff_auth_events WHERE event_type='login'").get());
  store.db.close();
});
