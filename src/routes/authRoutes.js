'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');

// ─── Validation chains ───────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required.'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must differ from current password.');
      }
      return true;
    }),
];

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student account (public)
 * @access  Public
 */
router.post('/register', registerValidation, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshValidation, validate, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);

module.exports = router;
