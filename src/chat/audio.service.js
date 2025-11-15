import { randomBytes } from 'node:crypto';
import path from 'node:path';

import storage from '../services/storage.service.js';

function resolveExtension(mimetype, originalName) {
  if (mimetype && mimetype.includes('/')) {
    const ext = mimetype.split('/')[1];
    if (ext) return ext;
  }
  const fallback = originalName ? path.extname(originalName).replace('.', '') : '';
  return fallback || 'webm';
}

function sanitizeWaveform(waveform) {
  if (!Array.isArray(waveform)) return undefined;
  return waveform
    .map((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.min(1, num));
    })
    .filter((value) => value !== null)
    .slice(0, 120);
}

export async function storeVoiceMessage({
  buffer,
  mimetype,
  originalName,
  size,
  userId,
  duration = null,
  waveform
}) {
  const ext = resolveExtension(mimetype, originalName);
  const baseName = `${Date.now()}-${randomBytes(6).toString('hex')}-${userId}`;
  const key = `chat/${userId}/audio/${baseName}.${ext}`;
  const uploaded = await storage.uploadBuffer(buffer, {
    key,
    contentType: mimetype || `audio/${ext}`,
    cacheControl: 'public, max-age=86400'
  });
  const numericDuration = Number(duration);
  const normalizedDuration = Number.isFinite(numericDuration)
    ? Math.max(0, Math.min(600, Math.round(numericDuration * 10) / 10))
    : null;
  return {
    key: uploaded.key,
    url: uploaded.url,
    mime: mimetype || `audio/${ext}`,
    size,
    originalName,
    duration: normalizedDuration,
    waveform: sanitizeWaveform(waveform)
  };
}
