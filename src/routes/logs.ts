import { Router } from 'express';
import { db } from '../db/index.js';
import { nutritionLogs, painLogs } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// 1. Get nutrition logs (Latest 30)
router.get('/nutrition', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const logs = await db.select()
      .from(nutritionLogs)
      .where(eq(nutritionLogs.userId, userId))
      .orderBy(desc(nutritionLogs.createdAt))
      .limit(30);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching nutrition logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Add nutrition log
router.post('/nutrition', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const { mealType, calories, proteinG, carbsG, fatsG } = req.body;
    
    const [newLog] = await db.insert(nutritionLogs)
      .values({ userId, mealType, calories, proteinG, carbsG, fatsG })
      .returning();
      
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error logging nutrition:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Get pain logs
router.get('/pain', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const logs = await db.select()
      .from(painLogs)
      .where(eq(painLogs.userId, userId))
      .orderBy(desc(painLogs.createdAt));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching pain logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Add pain log
router.post('/pain', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const { bodyPart, painLevel, notes } = req.body;
    
    const [newLog] = await db.insert(painLogs)
      .values({ userId, bodyPart, painLevel, notes })
      .returning();
      
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error logging pain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
