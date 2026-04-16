import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const router = Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

import { db } from '../db/index.js';
import { nutritionLogs, painLogs, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

// AI Ticket Drafting Agent
router.post('/draft-ticket', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, userProblem } = req.body;

    // Fetch User Context
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const healthLogs = await db.select().from(painLogs).where(eq(painLogs.userId, userId)).limit(5).orderBy(desc(painLogs.createdAt));
    const foodLogs = await db.select().from(nutritionLogs).where(eq(nutritionLogs.userId, userId)).limit(5).orderBy(desc(nutritionLogs.createdAt));

    const context = {
      user,
      recentPainLogs: healthLogs,
      recentNutritionLogs: foodLogs
    };

    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(200).json({ 
        draft: `[AI Placeholder] Response for ${user?.fullName}. \nLogs Analyzed: ${healthLogs.length} health logs, ${foodLogs.length} nutrition logs. \nDraft: "We noticed your recent reports and want to help..."`
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are an AI support agent for Bek Fit. Use the provided user logs (pain history, nutrition) to draft a hyper-personalized response to the user's problem. Be specific and data-driven." 
        },
        { 
          role: "user", 
          content: `Problem: ${userProblem}\n\nContext Data:\n${JSON.stringify(context, null, 2)}` 
        }
      ],
    });

    res.json({ draft: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI Drafting Error:', error);
    res.status(500).json({ error: 'Failed to draft AI response' });
  }
});

export default router;
