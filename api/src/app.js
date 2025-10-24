import 'express-async-errors';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';

import env from './config/env.js';
import logger from './config/logger.js';
import { generalLimiter } from './middlewares/rateLimit.js';
import { sanitizeMiddleware } from './middlewares/sanitize.js';
import { requestLogger } from './middlewares/requestLogger.js';
import errorHandler from './middlewares/error.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adRoutes from './routes/ad.routes.js';
import geocodeRoutes from './routes/geocode.routes.js';
import healthRoutes from './routes/health.routes.js';
import { sendError } from './utils/responses.js';
import { HTTP_STATUS } from './config/constants.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Logging des requêtes HTTP
if (env.isDev) {
  app.use(requestLogger);
}

// Health checks (avant rate limiting)
app.use('/', healthRoutes);

// Rate limiting
app.use(generalLimiter);

// CORS
const selfOrigins = [
  `http://localhost:${env.port}`,
  `http://127.0.0.1:${env.port}`
];
const allowedOrigins = Array.from(new Set([...env.clientOrigins, ...selfOrigins]));

if (allowedOrigins.length) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        
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
          'https://images.unsplash.com',
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://via.placeholder.com',
          'https://unpkg.com'
        ],
        connectSrc: ["'self'"],
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
const publicDir = path.resolve('public');

app.use('/uploads/avatars', express.static(avatarsDir));
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes); // Alias pour compatibilité
app.use('/api/ads', adRoutes);
app.use('/api/geocode', geocodeRoutes);

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
