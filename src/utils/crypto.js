import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

function createTemporalToken(ttlMs) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  return { token, hash, expiresAt };
}

export function createVerificationToken() {
  return createTemporalToken(24 * 60 * 60 * 1000);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % alphabet.length;
    password += alphabet[index];
  }
  return password;
}
