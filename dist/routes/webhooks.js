import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
const router = Router();
// Clerk Webhook: User Created / Updated / Deleted
router.post('/clerk', async (req, res) => {
    try {
        const { data, type } = req.body;
        // Note: In production, verify Svix signature here!
        console.log(`[Webhook] Received Clerk event: ${type}`);
        if (type === 'user.created' || type === 'user.updated') {
            const email = data.email_addresses[0]?.email_address;
            const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            await db.insert(users)
                .values({
                id: data.id,
                email,
                fullName,
                avatarUrl: data.image_url,
            })
                .onConflictDoUpdate({
                target: users.id,
                set: { email, fullName, avatarUrl: data.image_url, updatedAt: new Date() }
            });
            console.log(`[Webhook] Synced user: ${data.id}`);
        }
        if (type === 'user.deleted') {
            await db.delete(users).where(eq(users.id, data.id));
            console.log(`[Webhook] Deleted user: ${data.id}`);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
});
export default router;
