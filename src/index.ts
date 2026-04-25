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
import routineRoutes from './routes/routines.js';
import planRoutes from './routes/plans.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Preflight is handled by the main cors middleware for standard setups

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/users-v2', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/plans', planRoutes);

// Base / Health Route
app.get('/', (req, res) => {
  res.json({ message: 'Bek Fit V1.3 Backend is Live!' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    v: '1.3.4',
    timestamp: new Date().toISOString(),
    trace: 'recovery_auth_bypass_v1',
    env: {
       hasDb: !!process.env.DATABASE_URL,
       hasClerk: !!process.env.CLERK_SECRET_KEY
    }
  });
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

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`[BekFit] Server running at http://localhost:${port}`);
  });
}

export default app;
