/**
 * Routes Index
 * Export all route modules for easy importing in server.js
 */
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const eventRoutes = require('./event.routes');
const bookingRoutes = require('./booking.routes');
const reviewRoutes = require('./review.routes');
const adminRoutes = require('./admin.routes');

module.exports = {
  authRoutes,
  userRoutes,
  eventRoutes,
  bookingRoutes,
  reviewRoutes,
  adminRoutes
};