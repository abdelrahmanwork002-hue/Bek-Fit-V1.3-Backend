import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { requireAuth } from './middleware/auth.js';
import exerciseRoutes from './routes/exercises.js';
import profileRoutes from './routes/profiles.js';
import webhookRoutes from './routes/webhooks.js';
import userRoutes from './routes/users.js';
import logRoutes from './routes/logs.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protected Route Example: User Profile Discovery
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const user = await db.query.users.findFirst({
      where: (user: any, { eq }: any) => eq(user.id, userId),
    });
    if (!user) return res.status(404).json({ error: 'Sync pending' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

app.listen(port, () => {
  console.log(`[BekFit] Server running at http://localhost:${port}`);
});
