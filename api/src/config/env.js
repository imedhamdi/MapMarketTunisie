import dotenv from 'dotenv';

dotenv.config();

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
  mongoUri: process.env.MONGO_URI ?? 'mongodb+srv://imedhamdi007:imed25516242@api-nodejs.lpnpgx4.mongodb.net/?retryWrites=true&w=majority&appName=API-NodeJS',
  mongoDbName: process.env.MONGO_DB_NAME ?? 'mapmarket',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  mail: {
    from: process.env.MAIL_FROM ?? 'MapMarket <no-reply@mapmarket.local>',
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? ''
  },
  resetBaseUrl: process.env.RESET_BASE_URL ?? 'http://localhost:5173/reset-password',
  cookie: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
};

export default Object.freeze(env);
