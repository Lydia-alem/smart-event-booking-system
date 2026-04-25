/**
 * Review Routes
 * Event review and rating endpoints
 *
 * REST PRINCIPLES APPLIED:
 * - Resource URI: /reviews
 * - HTTP verbs for operations:
 *   - GET /reviews - List reviews (200 OK)
 *   - GET /reviews/:id - Get single review (200 OK)
 *   - POST /reviews - Create review (201 Created)
 *   - PUT /reviews/:id - Update review (200 OK)
 *   - DELETE /reviews/:id - Delete review (200 OK)
 *   - POST /reviews/:id/helpful - Mark as helpful (200 OK)
 * - Proper status codes and authorization
 */
const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/review.controller');
const { auth } = require('../middleware/auth');
const { reviewValidation } = require('../middleware/validators');

/**
 * @route   GET /api/v1/reviews
 * @desc    Get all reviews (with filtering)
 * @access  Public
 * @query   eventId, minRating, page, limit, sort
 */
router.get('/', reviewController.getReviews);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get single review
 * @access  Public
 */
router.get('/:id', reviewController.getReviewById);

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a review for an event
 * @access  Private
 * @note    User must have a completed booking to review
 * @body    { eventId, rating, comment? }
 */
router.post('/', auth, reviewValidation.create, reviewController.createReview);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update own review
 * @access  Private (Owner only)
 * @body    { rating?, comment? }
 */
router.put('/:id', auth, reviewValidation.update, reviewController.updateReview);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete own review
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', auth, reviewController.deleteReview);

/**
 * @route   POST /api/v1/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post('/:id/helpful', auth, reviewController.markHelpful);

module.exports = router;