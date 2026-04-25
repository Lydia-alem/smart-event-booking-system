/**
 * Review Controller
 * Handles event reviews and ratings
 *
 * REST PRINCIPLES:
 * - Resource URI: /reviews/{id}
 * - HTTP verbs: POST (create), GET (read), PUT (update), DELETE (remove)
 * - Proper status codes for all operations
 */
const { Review, Booking, BOOKING_STATUS } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/reviews
 * @desc    Get all reviews (with filtering)
 * @access  Public
 */
const getReviews = asyncHandler(async (req, res) => {
  const { eventId, page = 1, limit = 10, minRating, sort = '-createdAt' } = req.query;

  const query = { isApproved: true };
  if (eventId) query.event = eventId;
  if (minRating) query.rating = { $gte: Number(minRating) };

  const reviews = await Review.find(query)
    .populate('user', 'firstName lastName avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Review.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total
      }
    }
  });
});

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get single review
 * @access  Public
 */
const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('user', 'firstName lastName avatar')
    .populate('event', 'title');

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  res.status(200).json({ success: true, data: { review } });
});

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a review for an event
 * @access  Private
 * @note    User must have attended the event (completed booking)
 */
const createReview = asyncHandler(async (req, res) => {
  const { eventId, rating, comment } = req.body;

  // Check if event exists
  const event = require('../models').Event;
  const eventDoc = await event.findById(eventId);
  if (!eventDoc) {
    throw new AppError('Event not found', 404);
  }

  // Check if user has a completed booking (attended event)
  const hasAttended = await Booking.findOne({
    user: req.userId,
    event: eventId,
    status: BOOKING_STATUS.COMPLETED
  });

  // For demo purposes, also allow confirmed bookings
  const hasBooking = await Booking.findOne({
    user: req.userId,
    event: eventId,
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] }
  });

  if (!hasBooking) {
    throw new AppError('You must have a booking to review this event', 403);
  }

  // Check if user already reviewed
  const existingReview = await Review.findOne({ user: req.userId, event: eventId });
  if (existingReview) {
    throw new AppError('You have already reviewed this event', 409);
  }

  // Create review
  const review = await Review.create({
    user: req.userId,
    event: eventId,
    rating,
    comment,
    isVerifiedAttendance: !!hasAttended
  });

  await review.populate('user', 'firstName lastName avatar');

  // Update event rating stats
  await Review.calculateEventRating(eventId);

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: { review }
  });
});

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update own review
 * @access  Private (Owner only)
 */
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Check ownership
  if (review.user.toString() !== req.userId.toString()) {
    throw new AppError('Not authorized to update this review', 403);
  }

  // Update fields
  if (rating) review.rating = rating;
  if (comment !== undefined) review.comment = comment;

  await review.save();
  await review.populate('user', 'firstName lastName avatar');

  // Update event rating stats
  await Review.calculateEventRating(review.event);

  res.status(200).json({
    success: true,
    message: 'Review updated',
    data: { review }
  });
});

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete own review
 * @access  Private (Owner/Admin)
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Check ownership (owner or admin)
  if (review.user.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this review', 403);
  }

  const eventId = review.event;
  await Review.findByIdAndDelete(req.params.id);

  // Update event rating stats
  await Review.calculateEventRating(eventId);

  res.status(200).json({
    success: true,
    message: 'Review deleted'
  });
});

/**
 * @route   POST /api/v1/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Check if user already voted
  if (review.voters.includes(req.userId)) {
    throw new AppError('You have already marked this review as helpful', 400);
  }

  review.voters.push(req.userId);
  review.helpfulVotes += 1;
  await review.save();

  res.status(200).json({
    success: true,
    message: 'Marked as helpful',
    data: { helpfulVotes: review.helpfulVotes }
  });
});

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  markHelpful
};