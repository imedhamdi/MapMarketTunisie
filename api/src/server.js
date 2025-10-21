import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import app from './app.js';
import env from './config/env.js';
import connectMongoose from './db/mongoose.js';

const server = http.createServer(app);
const port = env.port;

async function start() {
  await mkdir(path.resolve('uploads/avatars'), { recursive: true });
  await connectMongoose();
  server.listen(port, () => {
    console.log(`🚀 API + Front servis sur http://localhost:${port} (${env.nodeEnv})`);
  });
}

start().catch((error) => {
  console.error('Impossible de démarrer le serveur', error);
  process.exit(1);
});
