import { pgTable, text, timestamp, uuid, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'coach', 'admin']);
export const statusEnum = pgEnum('status', ['pending', 'completed', 'skipped']);
export const difficultyEnum = pgEnum('difficulty', ['beginner', 'intermediate', 'advanced']);

// 1. Users table (Clerk sync)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk User ID
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Profiles (Health details)
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  biologicalSex: text('biological_sex'),
  heightCm: integer('height_cm'),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2 }),
  activityLevel: text('activity_level'),
  fitnessGoals: text('fitness_goals').array(),
  languagePreference: text('language_preference').default('en'),
});

// 3. Exercises Library
export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url'),
  targetMuscle: text('target_muscle'),
  equipmentNeeded: text('equipment_needed').array(),
  difficulty: difficultyEnum('difficulty').default('beginner'),
});

// 4. Routines
export const routines = pgTable('routines', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'date' }).defaultNow(),
  status: statusEnum('status').default('pending'),
  isAiGenerated: boolean('is_ai_generated').default(false),
  notes: text('notes'),
});

// 5. Routine Exercises
export const routineExercises = pgTable('routine_exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  routineId: uuid('routine_id').references(() => routines.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: uuid('exercise_id').references(() => exercises.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer('order_index').notNull(),
  sets: integer('sets'),
  reps: text('reps'),
  durationSeconds: integer('duration_seconds'),
  restSeconds: integer('rest_seconds').default(60),
  rpe: integer('rpe'),
});

// 6. Pain Logs
export const painLogs = pgTable('pain_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bodyPart: text('body_part').notNull(),
  painLevel: integer('pain_level').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Nutrition Logs
export const nutritionLogs = pgTable('nutrition_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mealType: text('meal_type'),
  calories: integer('calories'),
  proteinG: integer('protein_g'),
  carbsG: integer('carbs_g'),
  fatsG: integer('fats_g'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Weight Logs (Progress)
export const weightLogs = pgTable('weight_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
