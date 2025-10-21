import 'express-async-errors';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import env from './config/env.js';
import { generalLimiter } from './middlewares/rateLimit.js';
import errorHandler from './middlewares/error.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adRoutes from './routes/ad.routes.js';
import { sendError } from './utils/responses.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

if (env.isDev) {
  app.use(morgan('dev'));
}

app.use(generalLimiter);
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
        return callback(new Error(`Origine non autorisée : ${origin}`));
      },
      credentials: true
    })
  );
}
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
app.use(hpp());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb', parameterLimit: 2000 }));
app.use(cookieParser());

const avatarsDir = path.resolve('uploads/avatars');
const publicDir = path.resolve('public');

app.use('/uploads/avatars', express.static(avatarsDir));
app.use(express.static(publicDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);

app.use('/api', (req, res) => {
  sendError(res, {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Ressource introuvable'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

export default app;
