import assert from 'node:assert/strict';
import test from 'node:test';
import { hardcodedUserForPin } from './hardcoded-access.mjs';

test('maps the fixed Q Cafe PINs to their intended access levels', () => {
  assert.deepEqual(hardcodedUserForPin('9696'), {
    id: 1,
    login: 'super-admin',
    name: 'Super admin',
    role: 'owner',
    access: 'super-admin',
  });
  assert.equal(hardcodedUserForPin('4563')?.access, 'admin');
  assert.equal(hardcodedUserForPin('1234')?.role, 'cashier');
  assert.equal(hardcodedUserForPin('0000'), undefined);
});
