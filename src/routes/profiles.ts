import { Router } from 'express';
import { db } from '../db/index.js';
import { profiles, users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schema for profile updates
const profileSchema = z.object({
  fullName: z.string().optional(),
  biologicalSex: z.string().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  activityLevel: z.string().optional(),
  fitnessGoals: z.array(z.string()).optional(),
  languagePreference: z.string().optional(),
});

// 1. Get current user profile (Details)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        // Assuming relations are defined in schema, but for now we'll just join or query separately
      }
    });

    // Manual join for profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId)
    });

    res.json({ ...userProfile, profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Update profile
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const data = profileSchema.parse(req.body);

    const [updatedProfile] = await db.insert(profiles)
      .values({ 
        userId, 
        ...data,
        weightKg: data.weightKg?.toString() // Decimal type fix
      } as any)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...data, weightKg: data.weightKg?.toString() } as any
      })
      .returning();

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).issues || (error as any).errors });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
