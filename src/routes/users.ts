import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { logAuditAction } from '../lib/audit.js';

const router = Router();

// 1. Get all users (Admin only)
const authMiddleware = process.env.NODE_ENV === 'production' ? requireAuth : (req: any, res: any, next: any) => next();

router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  console.log('[BACKEND DEBUG] GET /api/users reached');
  console.log('[BACKEND DEBUG] Auth Context:', (req as any).auth);
  try {
    const allUsers = await db.select().from(users);
    console.log('[BACKEND DEBUG] Found users in DB:', allUsers.length);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Create a new user directly (Admin only)
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, fullName, phoneNumber } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // 1. Create in Clerk
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email.trim()],
      password: password,
      firstName: fullName?.split(' ')[0] || '',
      lastName: fullName?.split(' ').slice(1).join(' ') || '',
      publicMetadata: {
        role,
        fullName
      }
    });

    // 2. Synchronize with Neon Database
    // We use a more robust sync: check for ID first, then Email
    let newUser;
    try {
      const results = await db.insert(users).values({
        id: clerkUser.id,
        email: email.trim().toLowerCase(),
        fullName: fullName,
        role: role as any,
        status: 'active'
      }).onConflictDoUpdate({
        target: [users.id],
        set: { 
           role: role as any, 
           fullName: fullName,
           email: email.trim().toLowerCase()
        }
      }).returning();
      newUser = results[0];
    } catch (dbError: any) {
       console.error('[DB SYNC ERROR]', dbError);
       // If it failed due to email conflict (e.g. existing user with same email but diff ID)
       // we attempt to update by email as a fallback
       if (dbError.code === '23505') { // Unique violation
          const results = await db.update(users)
            .set({ 
               id: clerkUser.id,
               role: role as any, 
               fullName: fullName 
            })
            .where(eq(users.email, email.trim().toLowerCase()))
            .returning();
          newUser = results[0];
       }
       
       if (!newUser) throw dbError;
    }

    // Log Audit
    await logAuditAction((req as any).auth.userId, clerkUser.id, 'user_created', `Directly created ${email} as ${role}`);

    res.json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    // Explicitly surface the underlying cause (Clerk error or DB constraint)
    const errorDetail = error.errors?.[0]?.longMessage || error.detail || error.message || 'Failed to create user';
    res.status(error.status || 500).json({ error: errorDetail });
  }
});

// 3. Invite a new user (deprecated but kept for compatibility)
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
      error: error.errors?.[0]?.longMessage || 'Failed to send invitation' 
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

// 4. Update user governance (Admin only)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { role, status, coachId } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (role) {
       if (!['user', 'coach', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
       updateData.role = role;
    }
    if (status) {
       if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
       updateData.status = status;
    }
    if (coachId !== undefined) {
       updateData.coachId = coachId;
    }

    // Update in Neon Database
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, id));

    // If role changed, update in Clerk Metadata
    if (role) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: { role }
      });
    }

    // Log Audit
    if (role) await logAuditAction((req as any).auth.userId, id, 'role_change', `Role updated to ${role}`);
    if (status) await logAuditAction((req as any).auth.userId, id, 'status_change', `Status set to ${status}`);
    if (coachId) await logAuditAction((req as any).auth.userId, id, 'coach_assignment', `Assigned to coach ${coachId}`);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
