import { randomBytes } from 'node:crypto';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import logger from '../config/logger.js';

const baseDir = path.resolve('uploads/chat');
const thumbnailsDir = path.join(baseDir, 'thumbnails');

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
  await mkdir(thumbnailsDir, { recursive: true });
}

export async function storeAttachment({ buffer, mimetype, originalName, size, userId }) {
  await ensureDir();
  const ext = mimetype.split('/')[1] || 'bin';
  const key = `${Date.now()}-${randomBytes(6).toString('hex')}-${userId}.${ext}`;
  const keyBase = key.replace(/\.[^/.]+$/, '');
  const filePath = path.join(baseDir, key);
  await writeFile(filePath, buffer);

  let thumbnailUrl = null;
  let width = null;
  let height = null;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    width = metadata.width ?? null;
    height = metadata.height ?? null;

    const thumbName = `${keyBase}-thumb.webp`;
    const thumbPath = path.join(thumbnailsDir, thumbName);
    await image
      .clone()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    thumbnailUrl = `/uploads/chat/thumbnails/${thumbName}`;
  } catch (error) {
    logger.warn('Impossible de générer la miniature de la pièce jointe', {
      error: error.message
    });
  }

  return {
    key,
    mime: mimetype,
    size,
    originalName,
    url: `/uploads/chat/${key}`,
    thumbnailUrl,
    width,
    height
  };
}

async function deleteAttachment(key) {
  const filePath = path.join(baseDir, key);
  try {
    await rm(filePath);
  } catch (_e) {
    // ignore if already gone
  }
  const thumbPath = path.join(thumbnailsDir, `${key.replace(/\.[^/.]+$/, '')}-thumb.webp`);
  await rm(thumbPath).catch(() => {});
}

export async function deleteAttachmentForUser(key, _userId) {
  // Ici on pourrait vérifier propriétaire; simplifié pour MVP
  return deleteAttachment(key);
}
