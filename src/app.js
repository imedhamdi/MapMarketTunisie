import 'express-async-errors';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';

import env from './config/env.js';
import logger from './config/logger.js';
import { generalLimiter } from './middlewares/rateLimit.js';
import { sanitizeMiddleware } from './middlewares/sanitize.js';
import { requestLogger } from './middlewares/requestLogger.js';
import errorHandler from './middlewares/error.js';
import healthRoutes from './routes/health.routes.js';
import seoRoutes from './routes/seo.routes.js';
import apiV1Routes from './routes/index.js';
import { sendError } from './utils/responses.js';
import { HTTP_STATUS } from './config/constants.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Compression GZIP/Brotli (AVANT tout le reste)
app.use(
  compression({
    level: 6, // Niveau de compression (0-9)
    threshold: 1024, // Compresser seulement si > 1KB
    filter: (req, res) => {
      // Ne pas compresser les images
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  })
);

// Logging des requêtes HTTP
if (env.isDev) {
  app.use(requestLogger);
}

// Health checks (avant rate limiting)
app.use('/', healthRoutes);

// Rate limiting
app.use(generalLimiter);

// CORS
const selfOrigins = [`http://localhost:${env.port}`, `http://127.0.0.1:${env.port}`];
const allowedOrigins = Array.from(new Set([...env.clientOrigins, ...selfOrigins]));

if (allowedOrigins.length) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        logger.warn('Origine non autorisée', { origin });
        return callback(new Error(`Origine non autorisée : ${origin}`));
      },
      credentials: true
    })
  );
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://via.placeholder.com',
          'https://unpkg.com'
        ],
        connectSrc: [
          "'self'",
          'https://nominatim.openstreetmap.org',
          ...(env.isDev ? ['ws://localhost:4000', 'wss://localhost:4000'] : [])
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })
);

// Protection contre les attaques HTTP Parameter Pollution
app.use(hpp());

// Body parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb', parameterLimit: 2000 }));

// Cookie parsing
app.use(cookieParser());

// Sanitization des inputs
app.use(sanitizeMiddleware);

// Static files
const avatarsDir = path.resolve('uploads/avatars');
const adsDir = path.resolve('uploads/ads');
const chatDir = path.resolve('uploads/chat');
const publicDir = path.resolve('public');

// Cache headers for static assets
app.use('/dist', (req, res, next) => {
  // Cache des fichiers dist (CSS/JS minifiés) pendant 1 an
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
});

app.use('/icons', (req, res, next) => {
  // Cache des icônes pendant 1 semaine
  res.setHeader('Cache-Control', 'public, max-age=604800');
  next();
});

app.use('/uploads/avatars', (req, res, next) => {
  // Cache des avatars pendant 1 jour
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
});
app.use('/uploads/ads', (req, res, next) => {
  // Cache des images d'annonces pendant 1 jour (modifiable selon besoins)
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
});

app.use('/uploads/chat', (req, res, next) => {
  // Cache court pour les pièces jointes (peut être ajusté)
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

app.use('/uploads/avatars', express.static(avatarsDir));
app.use('/uploads/ads', express.static(adsDir));
app.use('/uploads/chat', express.static(chatDir));
app.use(express.static(publicDir));

// SEO Routes (sitemap, robots.txt)
app.use('/', seoRoutes);

// API Routes - Version 1 (default)
app.use('/api/v1', apiV1Routes);
// Alias sans version pour rétrocompatibilité (deprecated)
app.use('/api', apiV1Routes);

// 404 pour les routes API non trouvées
app.use('/api', (req, res) => {
  sendError(res, {
    statusCode: HTTP_STATUS.NOT_FOUND,
    code: 'NOT_FOUND',
    message: 'Ressource introuvable'
  });
});

// Servir le frontend pour toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error handler (doit être le dernier middleware)
app.use(errorHandler);

export default app;
