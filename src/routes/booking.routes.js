/**
 * Booking Routes
 * Booking/ticket reservation endpoints
 *
 * REST PRINCIPLES APPLIED:
 * - Resource URI: /bookings
 * - HTTP verbs for state transitions:
 *   - GET /bookings - List user's bookings (200 OK)
 *   - GET /bookings/:id - Get booking details (200 OK)
 *   - POST /bookings - Create booking (201 Created)
 *   - POST /bookings/:id/cancel - Cancel booking (200 OK)
 *   - GET /bookings/:id/ticket - Get ticket info (200 OK)
 *   - GET /bookings/:id/download - Download ticket PDF
 * - Proper status codes and error handling
 */
const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth');
const { bookingValidation } = require('../middleware/validators');

/**
 * @route   GET /api/v1/bookings
 * @desc    Get all bookings for current user
 * @access  Private
 * @query   status, page, limit
 */
router.get('/', auth, bookingController.getMyBookings);

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details
 * @access  Private (Owner/Admin)
 */
router.get('/:id', auth, bookingController.getBookingById);

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a new booking
 * @access  Private
 * @body    { eventId, ticketsCount }
 */
router.post('/', auth, bookingValidation.create, bookingController.createBooking);

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private (Owner)
 * @body    { reason? }
 */
router.post('/:id/cancel', auth, bookingValidation.cancel, bookingController.cancelBooking);

/**
 * @route   GET /api/v1/bookings/:id/ticket
 * @desc    Get ticket information
 * @access  Private (Owner/Admin)
 */
router.get('/:id/ticket', auth, bookingController.downloadTicket);

/**
 * @route   GET /api/v1/bookings/:id/download
 * @desc    Download ticket PDF
 * @access  Private
 */
router.get('/:id/download', auth, bookingController.downloadTicketFile);

module.exports = router;