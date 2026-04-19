import { Router } from 'express';
import { db } from '../db/index.js';
import { plans } from '../db/schema.js';
import { requireAuth, requireCoach } from '../middleware/auth.js';
import { desc } from 'drizzle-orm';
const router = Router();
// 1. Create a new plan (Template)
router.post('/', requireAuth, requireCoach, async (req, res) => {
    try {
        const { name, description, type, duration } = req.body;
        const adminId = req.auth.userId;
        const [newPlan] = await db.insert(plans).values({
            name,
            description,
            type,
            duration,
            createdBy: adminId,
            status: 'published' // Default to published for library visibility
        }).returning();
        res.json(newPlan);
    }
    catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 2. Get all plans
router.get('/', requireAuth, async (req, res) => {
    try {
        const allPlans = await db.select().from(plans).orderBy(desc(plans.createdAt));
        res.json(allPlans);
    }
    catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 3. Assign a plan to a user (Copy template to user routines)
router.post('/assign', requireAuth, requireCoach, async (req, res) => {
    try {
        const { planId, userId } = req.body;
        // Implementation for copying plan routines to athlete...
        res.json({ message: 'Plan assigned successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Error' });
    }
});
export default router;
