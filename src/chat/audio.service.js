import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const audioDir = path.resolve('uploads/chat/audio');

async function ensureAudioDir() {
  await mkdir(audioDir, { recursive: true });
}

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
  await ensureAudioDir();
  const ext = resolveExtension(mimetype, originalName);
  const key = `${Date.now()}-${randomBytes(6).toString('hex')}-${userId}.${ext}`;
  const filePath = path.join(audioDir, key);
  await writeFile(filePath, buffer);
  const numericDuration = Number(duration);
  const normalizedDuration = Number.isFinite(numericDuration)
    ? Math.max(0, Math.min(600, Math.round(numericDuration * 10) / 10))
    : null;
  return {
    key,
    url: `/uploads/chat/audio/${key}`,
    mime: mimetype || `audio/${ext}`,
    size,
    originalName,
    duration: normalizedDuration,
    waveform: sanitizeWaveform(waveform)
  };
}
