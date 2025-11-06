import { randomBytes } from 'node:crypto';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseDir = path.resolve('uploads/chat');

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
}

export async function storeAttachment({ buffer, mimetype, originalName, size, userId }) {
  await ensureDir();
  const ext = mimetype.split('/')[1] || 'bin';
  const key = `${Date.now()}-${randomBytes(6).toString('hex')}-${userId}.${ext}`;
  const filePath = path.join(baseDir, key);
  await writeFile(filePath, buffer);
  return {
    key,
    mime: mimetype,
    size,
    originalName,
    url: `/uploads/chat/${key}`,
    thumbnailUrl: null,
    width: null,
    height: null
  };
}

async function deleteAttachment(key) {
  const filePath = path.join(baseDir, key);
  try {
    await rm(filePath);
  } catch (_e) {
    // ignore if already gone
  }
}

export async function deleteAttachmentForUser(key, _userId) {
  // Ici on pourrait vérifier propriétaire; simplifié pour MVP
  return deleteAttachment(key);
}
