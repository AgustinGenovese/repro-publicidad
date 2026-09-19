import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '../../..', '.env');
loadEnv({ path: envPath });

export const config = {
  port: Number(process.env.PORT) || 3000,
  mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/repro-publicidad',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-inseguro',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@repro.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
} as const;