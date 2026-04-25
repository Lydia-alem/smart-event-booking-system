/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 *
 * REST PRINCIPLES APPLIED:
 * - Authorization: Proper 403 Forbidden for insufficient permissions
 * - Resource ownership: Users can only modify their own resources
 * - Hierarchical roles: Admin > Organizer > User
 */
const { USER_ROLES } = require('../models');

/**
 * Middleware to check if user has one of the allowed roles
 * @param {...string} allowedRoles - Roles that can access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

// Role-specific middleware
const isAdmin = authorize(USER_ROLES.ADMIN);
const isOrganizer = authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN);
const isUser = authorize(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN);
const isOrganizerOrAdmin = authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN);

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceOwnerId - Function to get owner ID from request
 */
const checkOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const ownerId = await getResourceOwnerId(req);

      // Admin can access all resources
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      // Check ownership
      if (ownerId && ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error.'
      });
    }
  };
};

/**
 * Check if event belongs to the organizer
 */
const isEventOwner = checkOwnership(async (req) => {
  const Event = require('../models').Event;
  const event = await Event.findById(req.params.id || req.params.eventId);
  return event ? event.organizer : null;
});

/**
 * Check if booking belongs to the user
 */
const isBookingOwner = checkOwnership(async (req) => {
  const Booking = require('../models').Booking;
  const booking = await Booking.findById(req.params.id);
  return booking ? booking.user : null;
});

module.exports = {
  authorize,
  isAdmin,
  isOrganizer,
  isUser,
  isOrganizerOrAdmin,
  checkOwnership,
  isEventOwner,
  isBookingOwner
};