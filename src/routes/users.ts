import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';

const router = Router();

// 1. Get all users (Admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Update user role (Admin only)
router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'coach', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update in Neon Database
    await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));

    // Update in Clerk Metadata (for JWT verification)
    await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: { role }
    });

    res.json({ message: `Role updated to ${role}` });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
