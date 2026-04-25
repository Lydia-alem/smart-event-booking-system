/**
 * Event Routes
 * Event CRUD endpoints
 *
 * REST PRINCIPLES APPLIED:
 * - Resource-based URLs: /events, /events/:id
 * - HTTP verbs for operations:
 *   - GET /events - List events (200 OK)
 *   - GET /events/my-events - List user's events (200 OK)
 *   - GET /events/:id - Get single event (200 OK)
 *   - POST /events - Create event (201 Created)
 *   - PUT /events/:id - Update event (200 OK)
 *   - DELETE /events/:id - Delete event (200 OK)
 * - Query parameters for filtering: ?category, ?status, ?search, ?page, ?limit
 */
const express = require('express');
const router = express.Router();

const eventController = require('../controllers/event.controller');
const { auth, optionalAuth } = require('../middleware/auth');
const { isOrganizerOrAdmin } = require('../middleware/roles');
const { eventValidation } = require('../middleware/validators');

/**
 * @route   GET /api/v1/events
 * @desc    Get all events (with filtering, search, pagination)
 * @access  Public
 * @query   category, status, minPrice, maxPrice, startDate, endDate, search, page, limit, sort
 */
router.get('/', optionalAuth, eventController.getEvents);

/**
 * @route   GET /api/v1/events/my-events
 * @desc    Get events created by current user (organizers)
 * @access  Private (Organizer/Admin)
 */
router.get('/my-events', auth, isOrganizerOrAdmin, eventController.getMyEvents);

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get single event by ID
 * @access  Public
 */
router.get('/:id', eventController.getEventById);

/**
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (Organizer/Admin)
 * @body    { title, description, category, tags, startDate, endDate, location, capacity, price }
 */
router.post('/', auth, isOrganizerOrAdmin, eventValidation.create, eventController.createEvent);

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update an event
 * @access  Private (Owner/Admin)
 */
router.put('/:id', auth, eventValidation.update, eventController.updateEvent);

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete an event
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', auth, eventController.deleteEvent);

module.exports = router;