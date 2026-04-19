import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Middleware to protect routes and require a valid Clerk session
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authMiddleware = ClerkExpressWithAuth();
    return (authMiddleware as any)(req, res, next);
  } catch (err: any) {
    console.error('Clerk Auth Initialization Error:', err);
    return res.status(500).json({ error: 'Authentication Gateway Misconfigured' });
  }
};
// custom middleware to check for admin role
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  
  // Bypass for local testing
  if (process.env.NODE_ENV !== 'production') return next();

  if (!auth || auth.sessionClaims?.metadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
};

// custom middleware to check for coach role or higher
export const requireCoach = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  const role = auth?.sessionClaims?.metadata?.role;

  // Bypass for local testing
  if (process.env.NODE_ENV !== 'production') return next();

  if (!role || (role !== 'coach' && role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Coach access only' });
  }
  next();
};
