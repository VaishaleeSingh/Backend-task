'use strict';

const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();

const publicController = require('../controllers/publicController');
const { validate } = require('../middleware/validate');

// No authentication required for public routes

/**
 * @route   GET /api/public/content
 * @desc    Get all live/broadcasted content (students access this)
 * @access  Public
 * @query   page, limit, contentType, subject, gradeLevel, search
 */
router.get('/content', publicController.getLiveContent);

/**
 * @route   GET /api/public/content/:id
 * @desc    Get a specific live content item
 * @access  Public
 */
router.get(
  '/content/:id',
  [param('id').isUUID().withMessage('Content ID must be a valid UUID.')],
  validate,
  publicController.getLiveContentById
);

/**
 * @route   GET /api/public/live/:teacherId
 * @desc    Get current active content in rotation for a teacher
 * @access  Public
 */
router.get(
  '/live/:teacherId',
  [param('teacherId').isUUID().withMessage('Teacher ID must be a valid UUID.')],
  validate,
  publicController.getTeacherLiveContent
);

module.exports = router;
