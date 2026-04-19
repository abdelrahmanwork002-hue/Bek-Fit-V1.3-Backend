import { ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
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
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  
  if (process.env.NODE_ENV !== 'production') return next();

  if (!auth || !auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: No active session' });
  }

  let role = auth.sessionClaims?.metadata?.role;
  
  // Fallback: If JWT template is missing metadata, fetch live from Clerk
  if (!role) {
    try {
      const user = await clerkClient.users.getUser(auth.userId);
      role = user.publicMetadata?.role;
    } catch (e) {
      console.error('Failed to verify live role', e);
    }
  }

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only. Your current role is: ' + (role || 'undefined') });
  }
  next();
};

// custom middleware to check for coach role or higher
export const requireCoach = async (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;

  if (process.env.NODE_ENV !== 'production') return next();

  if (!auth || !auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: No active session' });
  }

  let role = auth.sessionClaims?.metadata?.role;

  // Fallback: If JWT template is missing metadata, fetch live from Clerk
  if (!role) {
    try {
      const user = await clerkClient.users.getUser(auth.userId);
      role = user.publicMetadata?.role;
    } catch (e) {
      console.error('Failed to verify live role', e);
    }
  }

  if (!role || (role !== 'coach' && role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Coach access only' });
  }
  next();
};
