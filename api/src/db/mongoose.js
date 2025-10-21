import mongoose from 'mongoose';

import env from '../config/env.js';

let isConnected = false;

export default async function connectMongoose() {
  if (isConnected) return mongoose.connection;
  const uri = env.mongoUri;

  if (!uri) {
    console.warn('⚠️  MONGO_URI non défini, la connexion MongoDB sera ignorée.');
    return null;
  }

  try {
    await mongoose.connect(uri, {
      dbName: env.mongoDbName
    });
    isConnected = true;
    console.log('✅ Connecté à MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB', error);
    throw error;
  }
}
