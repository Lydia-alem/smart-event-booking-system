/**
 * Auth Controller
 * Handles user authentication (register, login, logout)
 *
 * REST PRINCIPLES APPLIED:
 * - POST /auth/register - Create new user resource
 * - POST /auth/login - Authenticate and return JWT
 * - Stateless: No session stored, JWT sent on each request
 * - HTTP Status Codes: 201 (Created), 200 (OK), 401 (Unauthorized)
 */
const jwt = require('jsonwebtoken');
const { User, USER_ROLES } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Create user with specified role (default: user)
  const userRole = role === 'organizer' ? USER_ROLES.ORGANIZER : USER_ROLES.USER;

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: userRole,
    phone
  });

  // Generate token
  const token = generateToken(user._id);

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
  }

  // Return response (201 Created)
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user,
      token
    }
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return JWT
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if password is correct
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is banned
  if (user.status === 'banned') {
    throw new AppError('Your account has been suspended. Contact support.', 403);
  }

  // Generate token
  const token = generateToken(user._id);

  // Return response (200 OK)
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // For stateless JWT, logout is handled client-side
  // Server just confirms the request
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Don't reveal if user exists
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If email exists, reset instructions will be sent'
    });
  }

  // Generate reset token (in real app, store in DB with expiry)
  const resetToken = jwt.sign(
    { userId: user._id, type: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (emailError) {
    console.error('Password reset email failed:', emailError);
  }

  res.status(200).json({
    success: true,
    message: 'If email exists, reset instructions will be sent'
  });
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.type !== 'password-reset') {
    throw new AppError('Invalid reset token', 400);
  }

  // Find user and update password
  const user = await User.findById(decoded.userId).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.password = newPassword;
  await user.save();

  // Generate new login token
  const loginToken = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: { token: loginToken }
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword
};