import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { eq, sql } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { logAuditAction } from '../lib/audit.js';

const router = Router();

// 1. Get all users
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM public.users`);
    res.json(result.rows);
  } catch (error: any) {
    const tableList = await db.execute(sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')`);
    const tables = tableList.rows.map((r: any) => `${r.table_schema}.${r.table_name}`).join(', ');
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Internal User Fetch Error', 
      message: error.message,
      visible_tables: tables || 'NONE_FOUND'
    });
  }
});

// 2. Create a new user directly
router.post('/create', async (req, res) => {
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
    // Check if user already exists by email (handles re-provisioning)
    let newUser;
    const existing = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    
    if (existing.length > 0) {
      // Update existing record with new Clerk ID and role
      const results = await db.update(users)
        .set({ 
          id: clerkUser.id,
          fullName: fullName,
          role: role as any,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(users.email, email.trim().toLowerCase()))
        .returning();
      newUser = results[0];
    } else {
      // Fresh insert
      const results = await db.insert(users).values({
        id: clerkUser.id,
        email: email.trim().toLowerCase(),
        fullName: fullName,
        role: role as any,
        status: 'active'
      }).returning();
      newUser = results[0];
    }

    // Log Audit
    const adminId = (req as any).auth?.userId || 'SYSTEM_BYPASS';
    await logAuditAction(adminId, clerkUser.id, 'user_created', `Directly created ${email} as ${role}`);

    res.json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    // Explicitly surface the underlying cause (Clerk error or DB constraint)
    const errorDetail = error.errors?.[0]?.longMessage || error.detail || error.message || 'Failed to create user';
    res.status(error.status || 500).json({ error: errorDetail });
  }
});

// 3. Invite a new user (deprecated but kept for compatibility)
router.post('/invite', async (req, res) => {
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
    const adminId = (req as any).auth?.userId || 'SYSTEM_BYPASS';
    await logAuditAction(adminId, null as any, 'user_invited', `Invited ${email} as ${role} (Name: ${fullName})`);

    res.json(invitation);
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(error.status || 500).json({ 
      error: error.errors?.[0]?.longMessage || 'Failed to send invitation' 
    });
  }
});

// 3. Get audit logs for a specific user (Admin only)
router.get('/:id/audit', async (req, res) => {
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
router.patch('/:id', async (req, res) => {
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
    const adminId = (req as any).auth?.userId || 'SYSTEM_BYPASS';
    if (role) await logAuditAction(adminId, id, 'role_change', `Role updated to ${role}`);
    if (status) await logAuditAction(adminId, id, 'status_change', `Status set to ${status}`);
    if (coachId) await logAuditAction(adminId, id, 'coach_assignment', `Assigned to coach ${coachId}`);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
