/**
 * Validation Middleware using express-validator
 * Validates request body, params, and query parameters
 *
 * REST PRINCIPLES APPLIED:
 * - Input validation: Reject invalid requests early (400 Bad Request)
 * - Sanitization: Clean input data before processing
 */
const { validationResult, body, param, query } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validations
const authValidation = {
  register: [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['user', 'organizer']).withMessage('Invalid role'),
    validate
  ],
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    validate
  ]
};

// Event validations
const eventValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Event title is required')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('description')
      .trim()
      .notEmpty().withMessage('Event description is required')
      .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
    body('category')
      .notEmpty().withMessage('Category is required')
      .isIn(['concert', 'conference', 'workshop', 'seminar', 'exhibition', 'sports', 'festival', 'other'])
      .withMessage('Invalid category'),
    body('startDate')
      .notEmpty().withMessage('Start date is required')
      .isISO8601().withMessage('Invalid date format')
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error('Start date must be in the future');
        }
        return true;
      }),
    body('endDate')
      .notEmpty().withMessage('End date is required')
      .isISO8601().withMessage('Invalid date format')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('location.venue')
      .trim()
      .notEmpty().withMessage('Venue is required'),
    body('capacity')
      .notEmpty().withMessage('Capacity is required')
      .isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Invalid event ID'),
    validate
  ]
};

// Booking validations
const bookingValidation = {
  create: [
    body('eventId')
      .notEmpty().withMessage('Event ID is required')
      .isMongoId().withMessage('Invalid event ID'),
    body('ticketsCount')
      .notEmpty().withMessage('Number of tickets is required')
      .isInt({ min: 1, max: 10 }).withMessage('Tickets must be between 1 and 10'),
    validate
  ],
  cancel: [
    param('id')
      .isMongoId().withMessage('Invalid booking ID'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
    validate
  ]
};

// Review validations
const reviewValidation = {
  create: [
    body('eventId')
      .notEmpty().withMessage('Event ID is required')
      .isMongoId().withMessage('Invalid event ID'),
    body('rating')
      .notEmpty().withMessage('Rating is required')
      .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Invalid review ID'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
    validate
  ]
};

// User validations
const userValidation = {
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('phone')
      .optional()
      .trim(),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('organizationName')
      .optional()
      .trim(),
    validate
  ]
};

// Common param validations
const paramValidation = {
  mongoId: [
    param('id')
      .isMongoId().withMessage('Invalid ID format'),
    validate
  ]
};

module.exports = {
  validate,
  authValidation,
  eventValidation,
  bookingValidation,
  reviewValidation,
  userValidation,
  paramValidation
};