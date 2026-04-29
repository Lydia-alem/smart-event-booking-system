/**
 * Event Model
 * Represents an event in the Smart Event Booking System
 *
 * REST PRINCIPLES APPLIED:
 * - Resources identified by URIs: /events/{id}
 * - HTTP verbs: GET (read), POST (create), PUT (update), DELETE (remove)
 * - Stateless: No session stored on server
 */
const mongoose = require('mongoose');

// Event Status Enum
const EVENT_STATUS = {
  PENDING: 'pending',      // Awaiting admin approval
  APPROVED: 'approved',    // Approved and visible
  REJECTED: 'rejected',    // Rejected by admin
  CANCELLED: 'cancelled',  // Cancelled by organizer
  COMPLETED: 'completed',  // Event has ended
  ONGOING: 'ongoing'       // Event is currently happening
};

// Event Categories
const EVENT_CATEGORIES = {
  CONCERT: 'concert',
  CONFERENCE: 'conference',
  WORKSHOP: 'workshop',
  SEMINAR: 'seminar',
  EXHIBITION: 'exhibition',
  SPORTS: 'sports',
  FESTIVAL: 'festival',
  OTHER: 'other'
};

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: Object.values(EVENT_CATEGORIES),
    required: [true, 'Event category is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Event Details
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  location: {
    venue: {
      type: String,
      required: [true, 'Venue is required']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    // For online events
    isOnline: {
      type: Boolean,
      default: false
    },
    meetingLink: String
  },
  // Capacity and Pricing
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  availableTickets: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // Media
  image: {
    type: String, // URL to event image
    default: null
  },
  // Organizer Reference
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Status
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.PENDING
  },
  // Admin approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  // Statistics
  stats: {
    views: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 }
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
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ price: 1 });

// Update available tickets before validation
eventSchema.pre('validate', function(next) {
  if (this.isModified('capacity') || this.isNew) {
    this.availableTickets = this.capacity;
  }
  this.updatedAt = Date.now();
  next();
});

// Update status based on dates
eventSchema.methods.updateStatus = function() {
  const now = new Date();
  if (this.startDate > now) {
    this.status = EVENT_STATUS.APPROVED;
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = EVENT_STATUS.ONGOING;
  } else {
    this.status = EVENT_STATUS.COMPLETED;
  }
};

// Virtual for full address
eventSchema.virtual('fullAddress').get(function() {
  if (this.location.isOnline) return 'Online Event';
  const addr = this.location.address;
  return `${addr.street || ''}, ${addr.city || ''}, ${addr.country || ''}`;
});

// Transform output
eventSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  obj.fullAddress = this.fullAddress;
  return obj;
};

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event,
  EVENT_STATUS,
  EVENT_CATEGORIES
};