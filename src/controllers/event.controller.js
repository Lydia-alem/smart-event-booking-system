/**
 * Event Controller
 * Handles event CRUD operations
 *
 * REST PRINCIPLES APPLIED:
 * - Resource-based URLs: /events, /events/:id
 * - HTTP verbs: GET (read), POST (create), PUT (update), DELETE (remove)
 * - Proper status codes: 201 (Created), 200 (OK), 404 (Not Found)
 * - Filtering & pagination via query params
 */
const { Event, USER_ROLES } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

/**
 * @route   GET /api/v1/events
 * @desc    Get all events (with filtering, search, pagination)
 * @access  Public
 */
const getEvents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    status,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    search,
    sort = '-startDate'
  } = req.query;

  // Build query
  const query = {};

  // Only show approved events to public
  if (status) {
    query.status = status;
  } else if (req.user?.role !== USER_ROLES.ADMIN && req.user?.role !== USER_ROLES.ORGANIZER) {
    query.status = 'approved';
  }

  // Category filter
  if (category) query.category = category;

  // Price range
  if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
  if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

  // Date range
  if (startDate) query.startDate = { $gte: new Date(startDate) };
  if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Execute query
  const skip = (page - 1) * limit;
  const events = await Event.find(query)
    .populate('organizer', 'firstName lastName organizationName')
    .select('-rejectionReason')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const total = await Event.countDocuments(query);

  // Increment view count
  if (search) {
    await Event.updateMany(query, { $inc: { 'stats.views': 1 } });
  }

  res.status(200).json({
    success: true,
    data: {
      events,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        hasMore: skip + events.length < total
      }
    }
  });
});

/**
 * @route   GET /api/v1/events/my-events
 * @desc    Get events created by current organizer
 * @access  Private (Organizer/Admin)
 */
const getMyEvents = asyncHandler(async (req, res) => {
  const query = req.user.role === USER_ROLES.ADMIN ? {} : { organizer: req.userId };

  const events = await Event.find(query)
    .populate('organizer', 'firstName lastName organizationName')
    .sort('-createdAt');

  res.status(200).json({ success: true, data: { events } });
});

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get single event by ID
 * @access  Public
 */
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'firstName lastName organizationName email avatar')
    .populate('reviews');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Increment view count
  event.stats.views += 1;
  await event.save();

  res.status(200).json({ success: true, data: { event } });
});

/**
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (Organizer/Admin)
 */
const createEvent = asyncHandler(async (req, res) => {
  const {
    title, description, category, tags,
    startDate, endDate, location, capacity, price, currency, image
  } = req.body;

  const event = await Event.create({
    title,
    description,
    category,
    tags,
    startDate,
    endDate,
    location,
    capacity,
    price,
    currency,
    image,
    organizer: req.userId,
    status: 'approved' // Automatically approve so it shows up on the homepage
  });

  await event.populate('organizer', 'firstName lastName organizationName');

  // Notify admin about new event (in production)
  // await emailService.sendNewEventNotification(event);

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event }
  });
});

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update an event
 * @access  Private (Owner/Admin)
 */
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check ownership
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== USER_ROLES.ADMIN) {
    throw new AppError('Not authorized to update this event', 403);
  }

  const allowedUpdates = [
    'title', 'description', 'category', 'tags',
    'startDate', 'endDate', 'location', 'capacity', 'price', 'image'
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      event[field] = req.body[field];
    }
  });

  // If dates changed, may need re-approval
  if (req.body.startDate || req.body.endDate) {
    event.status = 'pending';
  }

  await event.save();
  await event.populate('organizer', 'firstName lastName organizationName');

  res.status(200).json({ success: true, message: 'Event updated', data: { event } });
});

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete an event
 * @access  Private (Owner/Admin)
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check ownership
  if (event.organizer.toString() !== req.userId.toString() && req.user.role !== USER_ROLES.ADMIN) {
    throw new AppError('Not authorized to delete this event', 403);
  }

  // Check for existing bookings
  const Booking = require('../models').Booking;
  const existingBookings = await Booking.countDocuments({
    event: event._id,
    status: { $in: ['confirmed', 'pending'] }
  });

  if (existingBookings > 0) {
    throw new AppError('Cannot delete event with existing bookings', 400);
  }

  await Event.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, message: 'Event deleted' });
});

module.exports = {
  getEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};