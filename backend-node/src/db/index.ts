import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/rajafinal';

const poolSize = process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 10;
const isSSL = connectionString.includes('sslmode=require') || connectionString.includes('.render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase') || connectionString.includes('aiven') || connectionString.includes('postgres.database.azure.com');

export const pool = new pg.Pool({
  connectionString,
  max: poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
