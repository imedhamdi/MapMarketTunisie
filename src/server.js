import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import app from './app.js';
import { initChatSocket } from './chat/chat.socket.js';
import env from './config/env.js';
import logger from './config/logger.js';
import connectMongoose from './db/mongoose.js';
import redis from './config/redis.js';
import Ad from './models/ad.model.js';

const server = http.createServer(app);
let io = null; // Socket.IO instance
const port = env.port;

// Getter pour accéder à l'instance Socket.IO depuis d'autres modules
export function getIO() {
  return io;
}

async function start() {
  try {
    // Créer les répertoires nécessaires
    await mkdir(path.resolve('uploads/avatars'), { recursive: true });
    await mkdir(path.resolve('logs'), { recursive: true });
    await mkdir(path.resolve('uploads/ads'), { recursive: true });

    // Connexion à MongoDB
    await connectMongoose();
    await Ad.syncIndexes().catch((error) => {
      logger.warn('Synchronisation des index échouée', { error: error.message });
    });

    // Connexion à Redis (optionnel)
    if (env.redisEnabled) {
      await redis.connect();

      // Vider le cache au démarrage en dev/test (garder le cache en production)
      if (env.nodeEnv !== 'production') {
        await redis.flushAll();
        logger.info(`🧹 Cache Redis vidé (mode ${env.nodeEnv})`);
      }
    }

    // Initialiser Socket.IO si activé
    if (env.socketIoEnabled) {
      try {
        io = await initChatSocket(server);
        logger.info('💬 Socket.IO chat initialisé', { path: env.socketIoPath });
      } catch (e) {
        logger.error('Erreur initialisation Socket.IO', { error: e.message });
      }
    } else {
      logger.info('Socket.IO désactivé (SOCKET_IO_ENABLED=false)');
    }

    // Démarrer le serveur HTTP
    server.listen(port, () => {
      logger.info(`🚀 Serveur démarré sur http://localhost:${port}`, {
        environment: env.nodeEnv,
        port,
        redis: env.redisEnabled ? 'enabled' : 'disabled',
        socket: env.socketIoEnabled ? 'enabled' : 'disabled'
      });
    });

    // Gestion propre de l'arrêt
    const shutdown = async () => {
      logger.info('🛑 Arrêt du serveur en cours...');

      // Fermer Redis
      if (env.redisEnabled) {
        await redis.disconnect();
      }

      if (io) {
        try {
          await new Promise((resolve) => io.close(resolve));
          logger.info('🔌 Socket.IO arrêté');
        } catch (e) {
          logger.warn('Arrêt Socket.IO échoué', { error: e.message });
        }
      }

      server.close(() => {
        logger.info('✅ Serveur arrêté proprement');
        process.exit(0);
      });

      // Force la fermeture après 10 secondes
      setTimeout(() => {
        logger.error('⚠️ Arrêt forcé du serveur');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('❌ Impossible de démarrer le serveur', { error: error.message });
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée', { error: error.message, stack: error.stack });
  process.exit(1);
});

start();
