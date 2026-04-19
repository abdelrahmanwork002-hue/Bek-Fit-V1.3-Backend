import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export async function logAuditAction(adminId: string, targetUserId: string, action: string, details?: string) {
  try {
    await db.insert(auditLogs).values({
      adminId,
      targetUserId,
      action,
      details
    } as any);
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
