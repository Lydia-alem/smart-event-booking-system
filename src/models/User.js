/**
 * User Model
 * Represents a user in the Smart Event Booking System
 *
 * REST PRINCIPLES APPLIED:
 * - Resource-based: Each document is a resource identified by _id
 * - Proper HTTP semantics: Supported through routes using GET, POST, PUT, DELETE
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Roles Enum
const USER_ROLES = {
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin'
};

// User Status Enum
const USER_STATUS = {
  ACTIVE: 'active',
  BANNED: 'banned',
  PENDING: 'pending'
};

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // For organizers
  organizationName: {
    type: String,
    trim: true
  },
  // Notifications preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    bookingUpdates: {
      type: Boolean,
      default: true
    },
    eventUpdates: {
      type: Boolean,
      default: true
    }
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

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform output (remove sensitive data)
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  USER_ROLES,
  USER_STATUS
};