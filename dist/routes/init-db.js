import { Router } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
const router = Router();
router.get('/', async (req, res) => {
    try {
        console.log('Initializing database schema...');
        // Create Enums if they don't exist (using raw SQL for robustness)
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE role AS ENUM ('user', 'coach', 'admin');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE status AS ENUM ('pending', 'completed', 'skipped');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        // Create Users table
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY,
      "email" text NOT NULL UNIQUE,
      "full_name" text,
      "avatar_url" text,
      "role" role DEFAULT 'user',
      "status" text DEFAULT 'active',
      "coach_id" text REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );`);
        // Create Audit Logs
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" text NOT NULL REFERENCES "users"("id"),
      "target_user_id" text REFERENCES "users"("id"),
      "action" text NOT NULL,
      "details" text,
      "created_at" timestamp DEFAULT now()
    );`);
        // Add more tables if needed, but users and audit_logs are critical for UserManagement
        res.json({ message: 'Database initialized successfully' });
    }
    catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});
export default router;
