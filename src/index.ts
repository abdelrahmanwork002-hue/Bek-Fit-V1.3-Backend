import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protected Route Example: Get Current User Profile
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const userId = auth.userId;

    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not synchronized yet' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Sync Webhook Placeholder
app.post('/api/webhooks/user-created', async (req, res) => {
  // Logic to sync Clerk user with Neon database
  // This would usually verify the Svix signature
  res.json({ message: 'Webhook received' });
});

app.listen(port, () => {
  console.log(`[BekFit] Server running at http://localhost:${port}`);
});
