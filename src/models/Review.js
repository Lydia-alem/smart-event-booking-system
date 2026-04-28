/**
 * Review Model
 * Represents a review/rating for an event in the Smart Event Booking System
 *
 * REST PRINCIPLES APPLIED:
 * - Resource URI: /reviews/{id}
 * - HTTP verbs: POST (create), GET (read), PUT (update), DELETE (remove own review)
 * - Proper status codes: 201 (Created), 200 (OK), 403 (Forbidden), 404 (Not Found)
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  // Review Content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true
  },
  // Review metadata
  isVerifiedAttendance: {
    type: Boolean,
    default: false // True only if user has a completed booking for the event
  },
  // Helpful votes
  helpfulVotes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Admin moderation
  isApproved: {
    type: Boolean,
    default: true // Auto-approve for simplicity, can be changed
  },
  flaggedForReview: {
    type: Boolean,
    default: false
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
reviewSchema.index({ user: 1 });
reviewSchema.index({ event: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
// Unique constraint: one review per user per event
reviewSchema.index({ user: 1, event: 1 }, { unique: true });

// Update timestamp on save
reviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to calculate average rating for an event
reviewSchema.statics.calculateEventRating = async function (eventId) {
  const stats = await this.aggregate([
    { $match: { event: eventId, isApproved: true } },
    {
      $group: {
        _id: '$event',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    // Update Event stats
    const Event = mongoose.model('Event');
    await Event.findByIdAndUpdate(eventId, {
      'stats.averageRating': Math.round(stats[0].averageRating * 10) / 10,
      'stats.totalRatings': stats[0].totalRatings
    });
  }

  return stats[0] || { averageRating: 0, totalRatings: 0 };
};

// Static method to get reviews for an event
reviewSchema.statics.getEventReviews = function (eventId, options = {}) {
  const { limit = 20, page = 1, sort = '-createdAt' } = options;
  const skip = (page - 1) * limit;

  return this.find({ event: eventId, isApproved: true })
    .populate('user', 'firstName lastName avatar')
    .select('-voters')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Method to check if user attended the event
reviewSchema.methods.checkAttendance = async function () {
  const Booking = mongoose.model('Booking');
  const booking = await Booking.findOne({
    user: this.user,
    event: this.event,
    status: 'completed'
  });
  this.isVerifiedAttendance = !!booking;
  return this.isVerifiedAttendance;
};

// Transform output
reviewSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.voters;
  return obj;
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;