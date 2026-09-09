const FIXED_USERS = Object.freeze({
  '9696': { id: 1, login: 'super-admin', name: 'Super admin', role: 'owner', access: 'super-admin' },
  '4563': { id: 2, login: 'admin', name: 'Admin', role: 'owner', access: 'admin' },
  '1234': { id: 3, login: 'cashier', name: 'Cashier', role: 'cashier', access: 'cashier' },
});

export function hardcodedUserForPin(pin) {
  const user = FIXED_USERS[String(pin ?? '')];
  return user ? { ...user } : undefined;
}
