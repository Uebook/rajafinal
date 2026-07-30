import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const poolSize = process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 20;

const isSSL = connectionString.includes('sslmode=require') || connectionString.includes('.render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase') || connectionString.includes('aiven');

export const pool = new pg.Pool({
  connectionString,
  max: poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: isSSL ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
