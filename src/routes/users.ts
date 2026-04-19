import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { logAuditAction } from '../lib/audit.js';

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

// 2. Invite a new user
router.post('/invite', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, role, fullName } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Create invitation in Clerk
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role,
        fullName,
      },
      // redirectUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    });

    // Log Audit
    await logAuditAction((req as any).auth.userId, null as any, 'user_invited', `Invited ${email} as ${role} (Name: ${fullName})`);

    res.json(invitation);
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(error.status || 500).json({ 
      message: error.errors?.[0]?.longMessage || 'Failed to send invitation' 
    });
  }
});

// 3. Get audit logs for a specific user (Admin only)
router.get('/:id/audit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const logs = await db.query.auditLogs.findMany({
      where: (l: any, { eq }: any) => eq(l.targetUserId, id),
      with: {
        // admin: true // can join with users to get admin name
      },
      orderBy: (l: any, { desc }: any) => [desc(l.createdAt)]
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Update user role (Admin only)
router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
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

    // Log Audit
    await logAuditAction((req as any).auth.userId, id, 'role_change', `Role updated to ${role}`);

    res.json({ message: `Role updated to ${role}` });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
