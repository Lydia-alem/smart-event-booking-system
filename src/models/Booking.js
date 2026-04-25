/**
 * Booking Model
 * Represents a booking/ticket reservation in the Smart Event Booking System
 *
 * REST PRINCIPLES APPLIED:
 * - Resource URI: /bookings/{id}
 * - HTTP verbs for state transitions: POST (create), GET (read), DELETE (cancel)
 * - Stateless: Booking state managed through status field, not session
 */
const mongoose = require('mongoose');

// Booking Status Enum
const BOOKING_STATUS = {
  PENDING: 'pending',      // Booking created, awaiting payment
  CONFIRMED: 'confirmed',  // Payment confirmed
  CANCELLED: 'cancelled',  // Cancelled by user or system
  COMPLETED: 'completed',  // Event attended
  REFUNDED: 'refunded'     // Payment refunded
};

const bookingSchema = new mongoose.Schema({
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
  // Booking Details
  ticketsCount: {
    type: Number,
    required: [true, 'Number of tickets is required'],
    min: [1, 'Must book at least 1 ticket'],
    max: [10, 'Cannot book more than 10 tickets at once']
  },
  totalPrice: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // Status
  status: {
    type: String,
    enum: Object.values(BOOKING_STATUS),
    default: BOOKING_STATUS.CONFIRMED
  },
  // Ticket Reference
  ticketCode: {
    type: String,
    unique: true
  },
  ticketPDF: {
    type: String // Path to generated PDF
  },
  // Payment (simplified for demo)
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer'],
      default: 'credit_card'
    },
    transactionId: String,
    paidAt: Date
  },
  // Booking History
  history: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String,
  refundedAt: Date,
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
bookingSchema.index({ user: 1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ ticketCode: 1 });
bookingSchema.index({ createdAt: -1 });

// Generate ticket code before saving
bookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketCode) {
    // Generate unique ticket code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.ticketCode = `TKT-${timestamp}-${random}`.toUpperCase();
  }

  // Update timestamp
  this.updatedAt = Date.now();

  // Add to history if status changed
  if (this.isModified('status')) {
    this.history.push({
      status: this.status,
      changedAt: Date.now(),
      changedBy: this._user || this.user
    });
  }

  next();
});

// Static method to get user bookings
bookingSchema.statics.getUserBookings = function(userId) {
  return this.find({ user: userId })
    .populate('event', 'title startDate location image')
    .sort({ createdAt: -1 });
};

// Static method to get event bookings
bookingSchema.statics.getEventBookings = function(eventId) {
  return this.find({ event: eventId })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Transform output
bookingSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.payment?.transactionId; // Hide sensitive payment info
  return obj;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = {
  Booking,
  BOOKING_STATUS
};