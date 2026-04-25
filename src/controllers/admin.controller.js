/**
 * Admin Controller
 * Handles admin dashboard operations
 *
 * REST PRINCIPLES:
 * - Resource-based: /admin/users, /admin/events, /admin/stats
 * - HTTP verbs for state changes: GET (read stats), PUT (approve/reject)
 * - Admin-only access with proper authorization
 */
const { User, Event, Booking, Review, USER_ROLES, USER_STATUS, EVENT_STATUS } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
const getStats = asyncHandler(async (req, res) => {
  const [users, events, bookings, reviews] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments(),
    Booking.countDocuments(),
    Review.countDocuments()
  ]);

  const pendingEvents = await Event.countDocuments({ status: EVENT_STATUS.PENDING });
  const activeBookings = await Booking.countDocuments({ status: 'confirmed' });

  const recentBookings = await Booking.find()
    .populate('user', 'firstName lastName email')
    .populate('event', 'title')
    .sort('-createdAt')
    .limit(10);

  const topEvents = await Event.find()
    .sort('-stats.bookingsCount')
    .limit(10)
    .select('title stats.bookingsCount stats.averageRating');

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers: users,
        totalEvents: events,
        totalBookings: bookings,
        totalReviews: reviews,
        pendingEvents,
        activeBookings
      },
      recentBookings,
      topEvents
    }
  });
});

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (with filtering)
 * @access  Private (Admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;

  const query = {};
  if (role) query.role = role;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    }
  });
});

/**
 * @route   PUT /api/v1/admin/users/:id/ban
 * @desc    Ban a user
 * @access  Private (Admin)
 */
const banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new AppError('Cannot ban an admin', 403);
  }

  user.status = USER_STATUS.BANNED;
  await user.save();

  try {
    await emailService.sendAccountSuspensionEmail(user);
  } catch (emailError) {
    console.error('Ban notification email failed:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'User banned successfully',
    data: { user }
  });
});

/**
 * @route   PUT /api/v1/admin/users/:id/unban
 * @desc    Unban a user
 * @access  Private (Admin)
 */
const unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.status = USER_STATUS.ACTIVE;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User unbanned successfully',
    data: { user }
  });
});

/**
 * @route   PUT /api/v1/admin/users/:id/promote
 * @desc    Promote user to organizer
 * @access  Private (Admin)
 */
const promoteToOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new AppError('Cannot promote an admin', 403);
  }

  user.role = USER_ROLES.ORGANIZER;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User promoted to organizer',
    data: { user }
  });
});

/**
 * @route   GET /api/v1/admin/events/pending
 * @desc    Get pending events for approval
 * @access  Private (Admin)
 */
const getPendingEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ status: EVENT_STATUS.PENDING })
    .populate('organizer', 'firstName lastName organizationName email')
    .sort('createdAt');

  res.status(200).json({
    success: true,
    data: { events }
  });
});

/**
 * @route   PUT /api/v1/admin/events/:id/approve
 * @desc    Approve a pending event
 * @access  Private (Admin)
 */
const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.PENDING) {
    throw new AppError('Event is not pending approval', 400);
  }

  event.status = EVENT_STATUS.APPROVED;
  event.approvedBy = req.userId;
  event.approvedAt = new Date();
  await event.save();

  // Notify organizer
  try {
    await emailService.sendEventApprovedEmail(event);
  } catch (emailError) {
    console.error('Event approval email failed:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'Event approved',
    data: { event }
  });
});

/**
 * @route   PUT /api/v1/admin/events/:id/reject
 * @desc    Reject a pending event
 * @access  Private (Admin)
 */
const rejectEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.PENDING) {
    throw new AppError('Event is not pending approval', 400);
  }

  event.status = EVENT_STATUS.REJECTED;
  event.rejectionReason = reason || 'Event does not meet our guidelines';
  await event.save();

  // Notify organizer
  try {
    await emailService.sendEventRejectedEmail(event, reason);
  } catch (emailError) {
    console.error('Event rejection email failed:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'Event rejected',
    data: { event }
  });
});

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews for moderation
 * @access  Private (Admin)
 */
const getAllReviews = asyncHandler(async (req, res) => {
  const { flagged, page = 1, limit = 20 } = req.query;

  const query = {};
  if (flagged === 'true') query.flaggedForReview = true;

  const reviews = await Review.find(query)
    .populate('user', 'firstName lastName email')
    .populate('event', 'title')
    .sort('-createdAt')
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
 * @route   PUT /api/v1/admin/reviews/:id/approve
 * @desc    Approve a flagged review
 * @access  Private (Admin)
 */
const approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  review.isApproved = true;
  review.flaggedForReview = false;
  await review.save();

  res.status(200).json({
    success: true,
    message: 'Review approved',
    data: { review }
  });
});

/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete a flagged review
 * @access  Private (Admin)
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Review deleted'
  });
});

module.exports = {
  getStats,
  getUsers,
  banUser,
  unbanUser,
  promoteToOrganizer,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getAllReviews,
  approveReview,
  deleteReview
};