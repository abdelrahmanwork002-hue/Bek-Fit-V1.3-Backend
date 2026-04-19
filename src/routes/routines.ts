import { Router } from 'express';
import { db } from '../db/index.js';
import { routines, routineExercises, exercises } from '../db/schema.js';
import { requireAuth, requireCoach } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// 1. Get all routines for a specific user (Coach/Admin viewing athlete)
router.get('/user/:userId', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRoutines = await db.query.routines.findMany({
      where: eq(routines.userId, userId),
      orderBy: [desc(routines.scheduledDate)],
      with: {
        // Find exercises for these routines
      }
    });

    // Manually join routine exercises for each routine
    const enrichedRoutines = await Promise.all(userRoutines.map(async (r) => {
      const exers = await db.select()
        .from(routineExercises)
        .where(eq(routineExercises.routineId, r.id))
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id));
      return { ...r, exercises: exers };
    }));

    res.json(enrichedRoutines);
  } catch (error) {
    console.error('Error fetching user routines:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Update a specific routine exercise (Adjust sets/reps)
router.patch('/exercise/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const { sets, reps, rpe, restSeconds } = req.body;

    const [updated] = await db.update(routineExercises)
      .set({ 
        sets: sets ? parseInt(sets) : undefined,
        reps,
        rpe: rpe ? parseInt(rpe) : undefined,
        restSeconds: restSeconds ? parseInt(restSeconds) : undefined,
      })
      .where(eq(routineExercises.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating routine exercise:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Swap exercise
router.post('/swap', requireAuth, requireCoach, async (req, res) => {
  try {
    const { routineExerciseId, newExerciseId } = req.body;

    const [updated] = await db.update(routineExercises)
      .set({ exerciseId: newExerciseId })
      .where(eq(routineExercises.id, routineExerciseId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error swapping exercise:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
