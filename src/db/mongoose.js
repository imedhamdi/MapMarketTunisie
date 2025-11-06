import mongoose from 'mongoose';

import env from '../config/env.js';
import logger from '../config/logger.js';

let isConnected = false;

export default async function connectMongoose() {
  if (isConnected) {
    logger.debug('MongoDB déjà connecté');
    return mongoose.connection;
  }

  const uri = env.mongoUri;

  if (!uri) {
    logger.warn('⚠️  MONGO_URI non défini, la connexion MongoDB sera ignorée.');
    return null;
  }

  try {
    await mongoose.connect(uri, {
      dbName: env.mongoDbName
    });

    isConnected = true;
    logger.info('✅ Connecté à MongoDB', { dbName: env.mongoDbName });

    // Gérer les événements de connexion
    mongoose.connection.on('error', (error) => {
      logger.error('Erreur MongoDB', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB déconnecté');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnecté');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('❌ Erreur de connexion MongoDB', { error: error.message });
    throw error;
  }
}
