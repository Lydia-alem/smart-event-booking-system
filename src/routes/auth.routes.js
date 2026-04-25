/**
 * Auth Routes
 * Authentication endpoints (register, login, password reset)
 *
 * REST PRINCIPLES APPLIED:
 * - POST /auth/register - Create new user (201 Created)
 * - POST /auth/login - Authenticate user (200 OK)
 * - Stateless: JWT token sent in response, client stores it
 * - No session storage on server
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { authValidation } = require('../middleware/validators');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 * @body    { firstName, lastName, email, password, role?, phone? }
 */
router.post('/register', authValidation.register, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password }
 * @returns { token, user }
 */
router.post('/login', authValidation.login, authController.login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/me', auth, authController.getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout (client-side token removal)
 * @access  Private
 */
router.post('/logout', auth, authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, newPassword }
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;