import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

import logger from '../config/logger.js';
import storage from '../services/storage.service.js';

export async function storeAttachment({ buffer, mimetype, originalName, size, userId }) {
  const ext = mimetype.split('/')[1] || 'bin';
  const baseName = `${Date.now()}-${randomBytes(6).toString('hex')}-${userId}`;
  const key = `chat/${userId}/attachments/${baseName}.${ext}`;
  const keyBase = `chat/${userId}/attachments/${baseName}`;

  const uploaded = await storage.uploadBuffer(buffer, {
    key,
    contentType: mimetype
  });

  let thumbnailUrl = null;
  let width = null;
  let height = null;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    width = metadata.width ?? null;
    height = metadata.height ?? null;

    const thumbName = `${keyBase}-thumb.webp`;
    const thumbBuffer = await image
      .clone()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbUpload = await storage.uploadBuffer(thumbBuffer, {
      key: thumbName,
      contentType: 'image/webp'
    });

    thumbnailUrl = thumbUpload.url;
  } catch (error) {
    logger.warn('Impossible de générer la miniature de la pièce jointe', {
      error: error.message
    });
  }

  return {
    key: uploaded.key,
    mime: mimetype,
    size,
    originalName,
    url: uploaded.url,
    thumbnailUrl,
    width,
    height
  };
}

async function deleteAttachment(key) {
  await storage.deleteObject(key);
  const thumbKey = `${key.replace(/\.[^/.]+$/, '')}-thumb.webp`;
  await storage.deleteObject(thumbKey);
}

export async function deleteAttachmentForUser(key, _userId) {
  // Ici on pourrait vérifier propriétaire; simplifié pour MVP
  return deleteAttachment(key);
}
