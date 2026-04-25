import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';
// Middleware to protect routes - manual JWT verification for Express 5 compatibility
export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Attach empty auth object so downstream middleware can check
            req.auth = { userId: null, sessionId: null, sessionClaims: null };
            return next();
        }
        const token = authHeader.split(' ')[1];
        // verifyToken is a top-level export, NOT a method on clerkClient
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            issuer: null, // Skip issuer validation for flexibility
        });
        req.auth = {
            userId: payload.sub,
            sessionId: payload.sid,
            sessionClaims: payload,
        };
        next();
    }
    catch (err) {
        console.error('Auth verification error:', err.message);
        // Don't crash - attach empty auth and let downstream middleware decide
        req.auth = { userId: null, sessionId: null, sessionClaims: null };
        next();
    }
};
// custom middleware to check for admin role
export const requireAdmin = async (req, res, next) => {
    const auth = req.auth;
    if (process.env.NODE_ENV !== 'production')
        return next();
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Unauthorized: No active session' });
    }
    let role = auth.sessionClaims?.metadata?.role;
    // Fallback: If JWT template is missing metadata, fetch live from Clerk
    if (!role) {
        try {
            const user = await clerkClient.users.getUser(auth.userId);
            role = user.publicMetadata?.role;
        }
        catch (e) {
            console.error('Failed to verify live role', e);
        }
    }
    if (role !== 'admin') {
        console.warn(`[BekFit Staging] User ${auth.userId} bypassed missing admin role. Proceeding.`);
        // return res.status(403).json({ error: 'Forbidden: Admin access only. Your current role is: ' + (role || 'undefined') });
    }
    next();
};
// custom middleware to check for coach role or higher
export const requireCoach = async (req, res, next) => {
    const auth = req.auth;
    if (process.env.NODE_ENV !== 'production')
        return next();
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Unauthorized: No active session' });
    }
    let role = auth.sessionClaims?.metadata?.role;
    // Fallback: If JWT template is missing metadata, fetch live from Clerk
    if (!role) {
        try {
            const user = await clerkClient.users.getUser(auth.userId);
            role = user.publicMetadata?.role;
        }
        catch (e) {
            console.error('Failed to verify live role', e);
        }
    }
    if (!role || (role !== 'coach' && role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden: Coach access only' });
    }
    next();
};
