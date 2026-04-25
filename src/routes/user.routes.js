/**
 * User Routes
 * User profile management endpoints
 *
 * REST PRINCIPLES APPLIED:
 * - Resource: /users (profile management)
 * - GET /users/profile - Read own profile
 * - PUT /users/profile - Update own profile
 * - DELETE /users/account - Delete own account
 * - Proper ownership checks in middleware
 */
const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const { userValidation } = require('../middleware/validators');

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', auth, userController.getMyProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile
 * @access  Private
 * @body    { firstName?, lastName?, phone?, bio?, organizationName? }
 */
router.put('/profile', auth, userValidation.updateProfile, userController.updateMyProfile);

/**
 * @route   PUT /api/v1/users/password
 * @desc    Change password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put('/password', auth, userController.changePassword);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete own account
 * @access  Private
 */
router.delete('/account', auth, userController.deleteMyAccount);

module.exports = router;