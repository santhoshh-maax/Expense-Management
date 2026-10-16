const { getFirebase } = require('../config/firebase');
const { errorResponse } = require('../utils/response.utils');

/**
 * Authentication Middleware
 * Validates the Firebase ID token in the Authorization header.
 * Attaches the authenticated user's verified UID to req.user.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(
        res,
        'Authentication required. Missing or malformed Bearer token.',
        'UNAUTHORIZED',
        null,
        401
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return errorResponse(
        res,
        'Authentication token is empty.',
        'UNAUTHORIZED',
        null,
        401
      );
    }

    const { auth } = getFirebase();
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken || !decodedToken.uid) {
      return errorResponse(
        res,
        'Invalid authentication token payload.',
        'FORBIDDEN',
        null,
        403
      );
    }

    // Attach verified user information to request. Never trust client-provided UID!
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || decodedToken.displayName || 'User',
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error.message);
    return errorResponse(
      res,
      'Authentication failed: Invalid or expired token.',
      'INVALID_TOKEN',
      null,
      401
    );
  }
};

module.exports = {
  requireAuth,
};
