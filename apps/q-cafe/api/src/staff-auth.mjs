import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPin(pin) {
  validatePin(pin);
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function verifyPin(pin, stored) {
  validatePin(pin);
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function validatePin(pin) {
  if (!/^\d{4}$/u.test(pin ?? '')) throw new Error('PIN must be exactly four digits.');
}
