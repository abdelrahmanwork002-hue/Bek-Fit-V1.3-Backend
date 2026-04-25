import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from './dist/db/schema.js';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

try {
  const allUsers = await db.select().from(users);
  console.log('Drizzle Users Count:', allUsers.length);
} catch (e) {
  console.error('Drizzle Error:', e.message);
}
