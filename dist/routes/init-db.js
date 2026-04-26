import { Router } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
const router = Router();
router.get('/', async (req, res) => {
    try {
        console.log('Initializing full database schema...');
        // 1. Enums
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE role AS ENUM ('user', 'coach', 'admin');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE status AS ENUM ('pending', 'completed', 'skipped');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await db.execute(sql `DO $$ BEGIN
      CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        // 2. Core Tables
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
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "profiles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "biological_sex" text,
      "height_cm" integer,
      "weight_kg" decimal(5,2),
      "activity_level" text,
      "fitness_goals" text[],
      "language_preference" text DEFAULT 'en'
    );`);
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "exercises" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" text NOT NULL,
      "description" text,
      "video_url" text,
      "target_muscle" text,
      "equipment_needed" text[],
      "difficulty" difficulty DEFAULT 'beginner'
    );`);
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "routines" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "scheduled_date" timestamp DEFAULT now(),
      "status" status DEFAULT 'pending',
      "is_ai_generated" boolean DEFAULT false,
      "notes" text
    );`);
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "routine_exercises" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "routine_id" uuid NOT NULL REFERENCES "routines"("id") ON DELETE CASCADE,
      "exercise_id" uuid NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE,
      "order_index" integer NOT NULL,
      "sets" integer,
      "reps" text,
      "duration_seconds" integer,
      "rest_seconds" integer DEFAULT 60,
      "rpe" integer
    );`);
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" text NOT NULL REFERENCES "users"("id"),
      "target_user_id" text REFERENCES "users"("id"),
      "action" text NOT NULL,
      "details" text,
      "created_at" timestamp DEFAULT now()
    );`);
        await db.execute(sql `CREATE TABLE IF NOT EXISTS "plans" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "description" text,
      "type" text DEFAULT 'Strength',
      "duration" text DEFAULT '12 Weeks',
      "status" text DEFAULT 'draft',
      "created_by" text REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now()
    );`);
        res.json({ message: 'Full database schema initialized successfully' });
    }
    catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});
export default router;
