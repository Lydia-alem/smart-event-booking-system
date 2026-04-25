/**
 * User Controller
 * Handles user profile management
 *
 * REST PRINCIPLES:
 * - GET /users/:id - Read user resource
 * - PUT /users/:id - Update user resource
 * - DELETE /users/:id - Delete user resource (admin only)
 * - Proper ownership: Users can only modify their own profile
 */
const { User } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  res.status(200).json({ success: true, data: { user } });
});

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'organizationName', 'notifications'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.userId, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
});

/**
 * @route   PUT /api/v1/users/password
 * @desc    Change password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete own account
 * @access  Private
 */
const deleteMyAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.userId);

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  deleteMyAccount
};