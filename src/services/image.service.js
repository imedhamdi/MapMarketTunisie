/**
 * Service d'optimisation d'images
 * Utilise Sharp pour redimensionner et compresser les images
 */

import sharp from 'sharp';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { unlink, mkdir } from 'node:fs/promises';

import logger from '../config/logger.js';

const ADS_UPLOAD_DIR = path.resolve('uploads/ads');

function isDataUri(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function parseDataUri(value) {
  const matches = value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Data URI invalide');
  }
  const [, mime, data] = matches;
  return {
    mime,
    buffer: Buffer.from(data, 'base64')
  };
}

/**
 * Optimise un avatar utilisateur
 * @param {string} inputPath - Chemin du fichier source
 * @param {string} outputDir - Dossier de destination
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Chemins des fichiers générés
 */
export async function optimizeAvatar(inputPath, outputDir, userId) {
  const baseName = `avatar-${userId}`;

  try {
    const results = {
      sizes: {}
    };

    // Générer avatar en plusieurs tailles
    const image = sharp(inputPath);

    // Avatar standard (200x200)
    const standardPath = path.join(outputDir, `${baseName}.jpg`);
    await image
      .clone()
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(standardPath);
    results.standard = standardPath;
    results.sizes.standard = '/uploads/avatars/' + path.basename(standardPath);

    // Avatar thumbnail (50x50)
    const thumbPath = path.join(outputDir, `${baseName}-thumb.jpg`);
    await image
      .clone()
      .resize(50, 50, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    results.thumbnail = thumbPath;
    results.sizes.thumbnail = '/uploads/avatars/' + path.basename(thumbPath);

    // WebP pour navigateurs modernes
    const webpPath = path.join(outputDir, `${baseName}.webp`);
    await image
      .clone()
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(webpPath);
    results.webp = webpPath;
    results.sizes.webp = '/uploads/avatars/' + path.basename(webpPath);

    logger.info('Avatar optimisé', { userId, paths: results.sizes });

    // Supprimer l'original
    if (inputPath !== standardPath) {
      await unlink(inputPath).catch(() => {});
    }

    return results;
  } catch (error) {
    logger.error('Erreur optimisation avatar', { error: error.message, userId });
    throw error;
  }
}

/**
 * Traite et compresse les images d'annonces
 * @param {string[]} images - Tableau d'images (base64, URLs ou chemins déjà optimisés)
 * @param {Object} [options]
 * @param {string} [options.prefix='ad'] - Préfixe des fichiers générés
 * @returns {Promise<{images: string[], thumbnails: (string|null)[]}>}
 */
export async function processAdImages(images = [], { prefix = 'ad' } = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    return {
      images: [],
      previews: [],
      thumbnails: [],
      webpImages: [],
      webpPreviews: [],
      webpThumbnails: []
    };
  }

  await mkdir(ADS_UPLOAD_DIR, { recursive: true });

  const results = {
    images: [],
    previews: [],
    thumbnails: [],
    webpImages: [],
    webpPreviews: [],
    webpThumbnails: []
  };

  const variants = [
    { key: 'thumbnails', webpKey: 'webpThumbnails', label: '200', size: 200 },
    { key: 'previews', webpKey: 'webpPreviews', label: '400', size: 400 },
    { key: 'images', webpKey: 'webpImages', label: '800', size: 800 }
  ];

  for (const rawImage of images) {
    if (!rawImage) {
      continue;
    }

    if (isDataUri(rawImage)) {
      try {
        const { buffer } = parseDataUri(rawImage);
        const uid = randomUUID();
        const baseName = `${prefix}-${uid}`;
        const baseImage = sharp(buffer).rotate();

        for (const variant of variants) {
          const jpgName = `${baseName}-${variant.label}.jpg`;
          const jpgPath = path.join(ADS_UPLOAD_DIR, jpgName);
          await baseImage
            .clone()
            .resize(variant.size, variant.size, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85 })
            .toFile(jpgPath);

          const webpName = `${baseName}-${variant.label}.webp`;
          const webpPath = path.join(ADS_UPLOAD_DIR, webpName);
          await baseImage
            .clone()
            .resize(variant.size, variant.size, { fit: 'cover', position: 'center' })
            .webp({ quality: 85 })
            .toFile(webpPath);

          results[variant.key].push(`/uploads/ads/${jpgName}`);
          results[variant.webpKey].push(`/uploads/ads/${webpName}`);
        }

        continue;
      } catch (error) {
        logger.error('Erreur traitement image annonce', { error: error.message });
        continue;
      }
    }

    // Chemins déjà optimisés : les répliquer dans chaque variante JPEG, pas de WebP disponible
    results.images.push(rawImage);
    results.previews.push(rawImage);
    results.thumbnails.push(rawImage);
  }

  return {
    images: results.images,
    previews: results.previews,
    thumbnails: results.thumbnails,
    webpImages: results.webpImages,
    webpPreviews: results.webpPreviews,
    webpThumbnails: results.webpThumbnails
  };
}
