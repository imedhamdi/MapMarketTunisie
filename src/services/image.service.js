/**
 * Service d'optimisation d'images
 * Utilise Sharp pour redimensionner et compresser les images
 */

import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';
import storage from './storage.service.js';

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
export async function optimizeAvatar(input, userId) {
  const baseName = `avatar-${userId}-${Date.now()}`;

  try {
    const results = {
      sizes: {}
    };

    const image = sharp(input);

    const variants = [
      {
        id: 'standard',
        size: 200,
        format: 'jpeg',
        quality: 85,
        suffix: '',
        contentType: 'image/jpeg'
      },
      {
        id: 'thumbnail',
        size: 50,
        format: 'jpeg',
        quality: 80,
        suffix: '-thumb',
        contentType: 'image/jpeg'
      },
      {
        id: 'webp',
        size: 200,
        format: 'webp',
        quality: 85,
        suffix: '',
        contentType: 'image/webp'
      }
    ];

    for (const variant of variants) {
      const pipeline = image
        .clone()
        .resize(variant.size, variant.size, { fit: 'cover', position: 'center' });

      if (variant.format === 'webp') {
        pipeline.webp({ quality: variant.quality });
      } else {
        pipeline.jpeg({ quality: variant.quality });
      }

      const buffer = await pipeline.toBuffer();
      const extension = variant.format === 'jpeg' ? 'jpg' : 'webp';
      const key = `avatars/${userId}/${baseName}${variant.suffix}.${extension}`;

      const uploaded = await storage.uploadBuffer(buffer, {
        key,
        contentType: variant.contentType
      });
      results[variant.id] = uploaded.url;
      results.sizes[variant.id] = uploaded.url;
    }

    logger.info('Avatar optimisé', { userId, paths: results.sizes });

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
          const jpgBuffer = await baseImage
            .clone()
            .resize(variant.size, variant.size, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85 })
            .toBuffer();

          const jpgUpload = await storage.uploadBuffer(jpgBuffer, {
            key: `ads/${baseName}-${variant.label}.jpg`,
            contentType: 'image/jpeg'
          });

          const webpBuffer = await baseImage
            .clone()
            .resize(variant.size, variant.size, { fit: 'cover', position: 'center' })
            .webp({ quality: 85 })
            .toBuffer();

          const webpUpload = await storage.uploadBuffer(webpBuffer, {
            key: `ads/${baseName}-${variant.label}.webp`,
            contentType: 'image/webp'
          });

          results[variant.key].push(jpgUpload.url);
          results[variant.webpKey].push(webpUpload.url);
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
