/**
 * Models Index
 * Export all models for easy importing across the application
 */
const { User, USER_ROLES, USER_STATUS } = require('./User');
const { Event, EVENT_STATUS, EVENT_CATEGORIES } = require('./Event');
const { Booking, BOOKING_STATUS } = require('./Booking');
const Review = require('./Review');

module.exports = {
  User,
  Event,
  Booking,
  Review,
  USER_ROLES,
  USER_STATUS,
  EVENT_STATUS,
  EVENT_CATEGORIES,
  BOOKING_STATUS
};