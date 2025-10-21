import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { token, hash, expiresAt };
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
