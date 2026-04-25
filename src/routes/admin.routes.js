/**
 * Admin Routes
 * Admin dashboard and management endpoints
 *
 * REST PRINCIPLES APPLIED:
 * - Resource-based URLs: /admin/users, /admin/events, /admin/stats
 * - HTTP verbs for state changes:
 *   - GET /admin/stats - Get dashboard statistics (200 OK)
 *   - GET /admin/users - List all users (200 OK)
 *   - PUT /admin/users/:id/ban - Ban user (200 OK)
 *   - PUT /admin/users/:id/unban - Unban user (200 OK)
 *   - PUT /admin/users/:id/promote - Promote to organizer (200 OK)
 *   - GET /admin/events/pending - Get pending events (200 OK)
 *   - PUT /admin/events/:id/approve - Approve event (200 OK)
 *   - PUT /admin/events/:id/reject - Reject event (200 OK)
 *   - GET /admin/reviews - Get all reviews (200 OK)
 *   - PUT /admin/reviews/:id/approve - Approve flagged review (200 OK)
 *   - DELETE /admin/reviews/:id - Delete flagged review (200 OK)
 * - Admin-only access with proper authorization (403 Forbidden)
 */
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

// All admin routes require authentication and admin role
router.use(auth, isAdmin);

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (with filtering)
 * @access  Admin
 * @query   role, status, search, page, limit
 */
router.get('/users', adminController.getUsers);

/**
 * @route   PUT /api/v1/admin/users/:id/ban
 * @desc    Ban a user
 * @access  Admin
 */
router.put('/users/:id/ban', adminController.banUser);

/**
 * @route   PUT /api/v1/admin/users/:id/unban
 * @desc    Unban a user
 * @access  Admin
 */
router.put('/users/:id/unban', adminController.unbanUser);

/**
 * @route   PUT /api/v1/admin/users/:id/promote
 * @desc    Promote user to organizer
 * @access  Admin
 */
router.put('/users/:id/promote', adminController.promoteToOrganizer);

/**
 * @route   GET /api/v1/admin/events/pending
 * @desc    Get pending events for approval
 * @access  Admin
 */
router.get('/events/pending', adminController.getPendingEvents);

/**
 * @route   PUT /api/v1/admin/events/:id/approve
 * @desc    Approve a pending event
 * @access  Admin
 */
router.put('/events/:id/approve', adminController.approveEvent);

/**
 * @route   PUT /api/v1/admin/events/:id/reject
 * @desc    Reject a pending event
 * @access  Admin
 * @body    { reason? }
 */
router.put('/events/:id/reject', adminController.rejectEvent);

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews for moderation
 * @access  Admin
 * @query   flagged, page, limit
 */
router.get('/reviews', adminController.getAllReviews);

/**
 * @route   PUT /api/v1/admin/reviews/:id/approve
 * @desc    Approve a flagged review
 * @access  Admin
 */
router.put('/reviews/:id/approve', adminController.approveReview);

/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete a flagged review
 * @access  Admin
 */
router.delete('/reviews/:id', adminController.deleteReview);

module.exports = router;