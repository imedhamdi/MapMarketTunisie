import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import env from '../config/env.js';
import logger from '../config/logger.js';

const bucket = env.aws?.s3?.bucket;
const region = env.aws?.region;
const credentials =
  env.aws?.accessKeyId && env.aws?.secretAccessKey
    ? {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey
      }
    : undefined;

const isConfigured = Boolean(bucket && region && credentials);

const client = isConfigured
  ? new S3Client({
      region,
      credentials,
      forcePathStyle: env.aws?.s3?.forcePathStyle ?? false,
      endpoint: env.aws?.s3?.endpoint || undefined
    })
  : null;

if (!isConfigured) {
  logger.warn(
    "AWS S3 n'est pas entièrement configuré. Les opérations d'upload échoueront tant que les variables ne sont pas définies."
  );
}

const baseUrl =
  env.aws?.s3?.baseUrl?.replace(/\/+$/, '') ||
  (bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : '');

function normalizeKey(key) {
  if (!key) {
    return randomUUID();
  }
  return key.replace(/^\/+/, '');
}

export function getPublicUrl(key) {
  const normalizedKey = normalizeKey(key);
  if (!baseUrl) {
    return normalizedKey;
  }
  return `${baseUrl}/${normalizedKey}`;
}

export async function uploadBuffer(
  buffer,
  {
    key,
    contentType = 'application/octet-stream',
    cacheControl = 'public, max-age=31536000, immutable',
    metadata
  } = {}
) {
  if (!isConfigured || !client) {
    throw new Error('Stockage S3 non configuré.');
  }
  const normalizedKey = normalizeKey(key);
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
    Metadata: metadata
  });
  await client.send(putCommand);
  return {
    key: normalizedKey,
    url: getPublicUrl(normalizedKey)
  };
}

export async function deleteObject(key) {
  if (!isConfigured || !client || !key) {
    return;
  }

  const normalizedKey = normalizeKey(key);
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: normalizedKey
  });

  try {
    await client.send(deleteCommand);
  } catch (error) {
    logger.warn("Impossible de supprimer l'objet S3", {
      error: error.message,
      key: normalizedKey
    });
  }
}

export default {
  isConfigured,
  uploadBuffer,
  deleteObject,
  getPublicUrl
};
