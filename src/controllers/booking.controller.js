/**
 * Booking Controller
 * Handles booking/ticket reservations
 *
 * REST PRINCIPLES APPLIED:
 * - Resource URI: /bookings/{id}
 * - HTTP verbs: POST (create booking), GET (read), DELETE (cancel)
 * - Stateless: Booking state in database, not session
 * - Status codes: 201 (Created), 200 (OK), 400 (Bad Request), 409 (Conflict)
 */
const { Booking, Event, BOOKING_STATUS, USER_ROLES } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

/**
 * @route   GET /api/v1/bookings
 * @desc    Get all bookings for current user
 * @access  Private
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { user: req.userId };
  if (status) query.status = status;

  const bookings = await Booking.find(query)
    .populate('event', 'title startDate endDate location image price')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Booking.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total
      }
    }
  });
});

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details
 * @access  Private (Owner/Admin)
 */
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event')
    .populate('user', 'firstName lastName email');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Check ownership (owner or admin)
  if (booking.user._id.toString() !== req.userId.toString() && req.user.role !== USER_ROLES.ADMIN) {
    throw new AppError('Not authorized to view this booking', 403);
  }

  res.status(200).json({ success: true, data: { booking } });
});

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a new booking
 * @access  Private
 */
const createBooking = asyncHandler(async (req, res) => {
  const { eventId, ticketsCount } = req.body;

  // Find event
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check event status
  if (event.status !== 'approved') {
    throw new AppError('Event is not available for booking', 400);
  }

  // Check available tickets
  if (event.availableTickets < ticketsCount) {
    throw new AppError(`Only ${event.availableTickets} tickets available`, 400);
  }

  // Check if user already booked this event
  const existingBooking = await Booking.findOne({
    user: req.userId,
    event: eventId,
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] }
  });

  if (existingBooking) {
    throw new AppError('You already have an active booking for this event', 409);
  }

  // Calculate total price
  const totalPrice = event.price * ticketsCount;

  // Create booking
  const booking = await Booking.create({
    user: req.userId,
    event: eventId,
    ticketsCount,
    totalPrice,
    currency: event.currency,
    status: BOOKING_STATUS.CONFIRMED
  });

  // Update available tickets
  event.availableTickets -= ticketsCount;
  event.stats.bookingsCount += 1;
  await event.save();

  // Populate for response
  await booking.populate('event', 'title startDate location');

  // Send confirmation email
  try {
    await emailService.sendBookingConfirmation(booking);
  } catch (emailError) {
    console.error('Booking confirmation email failed:', emailError);
  }

  res.status(201).json({
    success: true,
    message: 'Booking confirmed successfully',
    data: { booking }
  });
});

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private (Owner)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Check ownership
  if (booking.user.toString() !== req.userId.toString()) {
    throw new AppError('Not authorized to cancel this booking', 403);
  }

  // Check if can be cancelled
  if (![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING].includes(booking.status)) {
    throw new AppError('Booking cannot be cancelled in current status', 400);
  }

  // Update booking status
  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason;
  await booking.save();

  // Restore available tickets
  const event = await Event.findById(booking.event);
  if (event) {
    event.availableTickets += booking.ticketsCount;
    event.stats.bookingsCount -= 1;
    await event.save();
  }

  // Send cancellation email
  try {
    await emailService.sendBookingCancellation(booking);
  } catch (emailError) {
    console.error('Cancellation email failed:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { booking }
  });
});

/**
 * @route   GET /api/v1/bookings/:id/ticket
 * @desc    Download booking ticket as PDF
 * @access  Private (Owner)
 */
const downloadTicket = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event')
    .populate('user', 'firstName lastName email');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Check ownership
  if (booking.user._id.toString() !== req.userId.toString() && req.user.role !== USER_ROLES.ADMIN) {
    throw new AppError('Not authorized', 403);
  }

  // Generate PDF ticket
  const pdfPath = await pdfService.generateTicket(booking);

  // Update booking with ticket path
  booking.ticketPDF = pdfPath;
  await booking.save();

  // Send ticket PDF
  res.status(200).json({
    success: true,
    message: 'Ticket generated',
    data: {
      ticketCode: booking.ticketCode,
      downloadUrl: `/api/v1/bookings/${booking._id}/download`
    }
  });
});

/**
 * @route   GET /api/v1/bookings/:id/download
 * @desc    Download ticket PDF file
 * @access  Private
 */
const downloadTicketFile = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking || !booking.ticketPDF) {
    throw new AppError('Ticket not found', 404);
  }

  // Check ownership
  if (booking.user.toString() !== req.userId.toString() && req.user.role !== USER_ROLES.ADMIN) {
    throw new AppError('Not authorized', 403);
  }

  res.download(booking.ticketPDF);
});

module.exports = {
  getMyBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  downloadTicket,
  downloadTicketFile
};