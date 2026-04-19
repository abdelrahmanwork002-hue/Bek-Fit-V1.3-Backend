import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
export async function logAuditAction(adminId, targetUserId, action, details) {
    try {
        await db.insert(auditLogs).values({
            adminId,
            targetUserId,
            action,
            details
        });
    }
    catch (error) {
        console.error('Failed to log audit action:', error);
    }
}
