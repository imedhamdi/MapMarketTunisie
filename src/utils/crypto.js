import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

function createTemporalToken(ttlMs) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  return { token, hash, expiresAt };
}

export function createResetToken() {
  return createTemporalToken(30 * 60 * 1000);
}

export function createVerificationToken() {
  return createTemporalToken(24 * 60 * 60 * 1000);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashResetToken(token) {
  return hashToken(token);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
