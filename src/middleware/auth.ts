import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Middleware to protect routes and require a valid Clerk session
export const requireAuth = ClerkExpressWithAuth() as unknown as RequestHandler;

// custom middleware to check for admin role
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  if (!auth || auth.sessionClaims?.metadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
};

// custom middleware to check for coach role or higher
export const requireCoach = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  const role = auth?.sessionClaims?.metadata?.role;
  if (!role || (role !== 'coach' && role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Coach access only' });
  }
  next();
};
