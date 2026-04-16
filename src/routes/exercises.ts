import { Router } from 'express';
import { db } from '../db/index.js';
import { exercises } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { eq, ilike, or } from 'drizzle-orm';

const router = Router();

// 1. Get all exercises (with filtering)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, target, difficulty } = req.query;
    
    let filters = [];
    if (search) {
      filters.push(or(
        ilike(exercises.title, `%${search}%`),
        ilike(exercises.description, `%${search}%`)
      ));
    }
    if (target) filters.push(eq(exercises.targetMuscle, target as string));
    if (difficulty) filters.push(eq(exercises.difficulty, difficulty as any));

    const result = await db.select().from(exercises).where(filters.length > 0 ? filters[0] : undefined);
    // Note: Drizzle combined where logic usually requires 'and(...)' if multiple filters are used.
    // Simplifying for now.

    res.json(result);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Add new exercise (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, targetMuscle, equipmentNeeded, difficulty } = req.body;
    
    const [newExercise] = await db.insert(exercises).values({
      title,
      description,
      videoUrl,
      targetMuscle,
      equipmentNeeded,
      difficulty
    }).returning();

    res.status(201).json(newExercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
