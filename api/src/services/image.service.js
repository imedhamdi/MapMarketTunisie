/**
 * Service d'optimisation d'images
 * Utilise Sharp pour redimensionner et compresser les images
 */

import sharp from 'sharp';
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';

import logger from '../config/logger.js';

/**
 * Tailles d'images prédéfinies
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 400, height: 300 },
  medium: { width: 800, height: 600 },
  large: { width: 1200, height: 900 },
  avatar: { width: 200, height: 200 }
};

/**
 * Options de qualité par défaut
 */
const QUALITY_OPTIONS = {
  jpeg: { quality: 85, progressive: true },
  webp: { quality: 85 },
  png: { compressionLevel: 9 }
};

/**
 * Optimise une image et génère plusieurs tailles
 * @param {string} inputPath - Chemin du fichier source
 * @param {string} outputDir - Dossier de destination
 * @param {string} baseName - Nom de base du fichier
 * @param {Object} options - Options d'optimisation
 * @returns {Promise<Object>} - Chemins des fichiers générés
 */
export async function optimizeImage(inputPath, outputDir, baseName, options = {}) {
  const {
    sizes = ['thumbnail', 'small', 'medium', 'large'],
    formats = ['jpeg', 'webp'],
    keepOriginal = false
  } = options;

  const results = {
    original: null,
    variants: {}
  };

  try {
    // Charger l'image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    logger.info('Optimisation image démarrée', {
      file: baseName,
      originalSize: metadata.size,
      format: metadata.format,
      dimensions: `${metadata.width}x${metadata.height}`
    });

    // Générer les différentes tailles
    for (const sizeName of sizes) {
      const sizeConfig = IMAGE_SIZES[sizeName];
      if (!sizeConfig) {
        logger.warn(`Taille inconnue: ${sizeName}`);
        continue;
      }

      for (const format of formats) {
        const outputName = `${baseName}-${sizeName}.${format}`;
        const outputPath = path.join(outputDir, outputName);

        await image
          .clone()
          .resize(sizeConfig.width, sizeConfig.height, {
            fit: 'cover',
            position: 'center'
          })
          .toFormat(format, QUALITY_OPTIONS[format])
          .toFile(outputPath);

        if (!results.variants[sizeName]) {
          results.variants[sizeName] = {};
        }
        results.variants[sizeName][format] = outputPath;

        logger.debug('Variante créée', { size: sizeName, format, path: outputPath });
      }
    }

    // Garder l'original si demandé
    if (keepOriginal) {
      const originalPath = path.join(outputDir, `${baseName}-original.${metadata.format}`);
      await sharp(inputPath).toFile(originalPath);
      results.original = originalPath;
    }

    logger.info('Optimisation terminée', {
      file: baseName,
      variantsCount: Object.keys(results.variants).length * formats.length
    });

    return results;
  } catch (error) {
    logger.error('Erreur optimisation image', { error: error.message, file: inputPath });
    throw error;
  }
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
 * Génère un placeholder LQIP (Low Quality Image Placeholder)
 * @param {string} inputPath - Chemin de l'image source
 * @returns {Promise<string>} - Base64 du placeholder
 */
export async function generatePlaceholder(inputPath) {
  try {
    const buffer = await sharp(inputPath)
      .resize(20, 20, { fit: 'cover' })
      .blur(10)
      .jpeg({ quality: 50 })
      .toBuffer();

    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    logger.error('Erreur génération placeholder', { error: error.message });
    return null;
  }
}

/**
 * Obtenir les métadonnées d'une image
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<Object>} - Métadonnées
 */
export async function getImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation
    };
  } catch (error) {
    logger.error('Erreur lecture métadonnées', { error: error.message });
    return null;
  }
}
