/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 *
 * REST PRINCIPLES APPLIED:
 * - Stateless authentication: Each request carries token in Authorization header
 * - Proper HTTP semantics: 401 for missing/invalid auth, 403 for insufficient permissions
 */
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect routes - require valid JWT
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token may be invalid.'
      });
    }

    // Check if user is banned
    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended.'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

// Optional auth - attach user if token is valid, but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user && user.status !== 'banned') {
          req.user = user;
          req.userId = user._id;
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

module.exports = { auth, optionalAuth };