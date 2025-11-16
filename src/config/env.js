import dotenv from 'dotenv';

dotenv.config();

/**
 * Valider qu'une variable d'environnement existe
 */
function requireEnv(key, defaultValue = undefined) {
  const value = process.env[key];

  if (!value && defaultValue === undefined && process.env.NODE_ENV === 'production') {
    throw new Error(`Variable d'environnement requise manquante: ${key}`);
  }

  return value || defaultValue;
}

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',

  get isDev() {
    return this.nodeEnv !== 'production';
  },

  get isProd() {
    return this.nodeEnv === 'production';
  },

  port: Number(process.env.PORT ?? 4000),

  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  get clientOrigin() {
    return this.clientOrigins[0] ?? 'http://localhost:5173';
  },

  // MongoDB
  mongoUri: requireEnv(
    'MONGO_URI',
    process.env.NODE_ENV === 'development'
      ? 'mongodb+srv://imedhamdi007:imed25516242@api-nodejs.lpnpgx4.mongodb.net/?retryWrites=true&w=majority&appName=API-NodeJS'
      : undefined
  ),
  mongoDbName: process.env.MONGO_DB_NAME ?? 'mapmarket',

  // JWT
  jwtAccessSecret: requireEnv(
    'JWT_ACCESS_SECRET',
    process.env.NODE_ENV === 'development' ? 'dev-access-secret-change-in-production' : undefined
  ),
  jwtRefreshSecret: requireEnv(
    'JWT_REFRESH_SECRET',
    process.env.NODE_ENV === 'development' ? 'dev-refresh-secret-change-in-production' : undefined
  ),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',

  // Email / Mailgun
  mail: {
    from: process.env.MAIL_FROM ?? 'MapMarket <no-reply@mapmarket.local>'
  },

  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY ?? '',
    domain: process.env.MAILGUN_DOMAIN ?? '',
    baseUrl: process.env.MAILGUN_API_BASE_URL ?? 'https://api.mailgun.net/v3'
  },

  verifyEmailBaseUrl: process.env.VERIFY_EMAIL_BASE_URL ?? 'http://localhost:5173/verify-email',

  // Redis (cache optionnel)
  redisEnabled: process.env.REDIS_ENABLED !== 'false',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD ?? '',

  // Cookies
  cookie: {
    sameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },

  // Monitoring Security
  monitoringToken: requireEnv(
    'MONITORING_TOKEN',
    process.env.NODE_ENV === 'development' ? 'dev-monitoring-token-change-in-production' : undefined
  ),
  monitoringTokenRequired: process.env.MONITORING_TOKEN_REQUIRED !== 'false',
  monitoringAllowedIps: (process.env.MONITORING_ALLOWED_IPS ?? '127.0.0.1,::1')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean),
  // Socket.IO configuration & Chat specific rate limits
  socketIoEnabled: process.env.SOCKET_IO_ENABLED !== 'false',
  socketIoPath: process.env.SOCKET_IO_PATH ?? '/ws/chat',
  socketIoCorsOrigins: (process.env.SOCKET_IO_CORS_ORIGINS
    ? process.env.SOCKET_IO_CORS_ORIGINS
    : (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  chat: {
    rateLimit: {
      messagesPerMinute: Number(process.env.CHAT_MESSAGES_PER_MINUTE ?? 60),
      typingPerTenSeconds: Number(process.env.CHAT_TYPING_EVENTS_PER_10S ?? 20)
    },
    typing: {
      debounceMs: Number(process.env.CHAT_TYPING_DEBOUNCE_MS ?? 3000)
    }
  },

  aws: {
    region: process.env.AWS_REGION ?? '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET_NAME ?? '',
      baseUrl: process.env.AWS_S3_BASE_URL ?? '',
      endpoint: process.env.AWS_S3_ENDPOINT ?? '',
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true'
    }
  }
};

// Validation en production
if (env.isProd) {
  const requiredVars = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONITORING_TOKEN'];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement requises manquantes en production: ${missing.join(', ')}`
    );
  }

  // Avertir si les secrets par défaut sont utilisés
  if (env.jwtAccessSecret.includes('dev-') || env.jwtRefreshSecret.includes('dev-')) {
    throw new Error('Les secrets JWT par défaut ne doivent pas être utilisés en production');
  }

  // Avertir si le token de monitoring par défaut est utilisé
  if (env.monitoringToken.includes('dev-')) {
    throw new Error('Le token de monitoring par défaut ne doit pas être utilisé en production');
  }
}

export default Object.freeze(env);
