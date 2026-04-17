import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  WARNING: DATABASE_URL is missing from environment variables.');
}

// Fallback to empty string if not provided so the server doesn't crash on invocation
const sql = neon(process.env.DATABASE_URL || 'postgres://placeholder_user:placeholder_pass@placeholder_host/placeholder_db');
export const db = drizzle(sql, { schema });
