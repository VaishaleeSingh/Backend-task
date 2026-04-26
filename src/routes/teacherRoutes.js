'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const teacherController = require('../controllers/teacherController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All teacher routes require authentication + teacher role
router.use(authenticate);
router.use(authorize('teacher'));

// ─── Validation chains ───────────────────────────────────────────────────────

const createContentValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ min: 3, max: 255 }),
  body('contentType')
    .optional()
    .isIn(['video', 'document', 'quiz', 'announcement', 'assignment'])
    .withMessage('Invalid content type.'),
  body('contentUrl').optional({ nullable: true }).isURL().withMessage('Content URL must be a valid URL.'),
  body('subject').optional().isLength({ max: 100 }),
  body('gradeLevel').optional().isLength({ max: 50 }),
  body('tags').optional().isArray().withMessage('Tags must be an array.'),
];

const updateContentValidation = [
  param('id').isUUID().withMessage('Content ID must be a valid UUID.'),
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('contentType').optional().isIn(['video', 'document', 'quiz', 'announcement', 'assignment']),
  body('contentUrl').optional({ nullable: true }).isURL().withMessage('Content URL must be valid.'),
];

const submitValidation = [
  param('id').isUUID().withMessage('Content ID must be a valid UUID.'),
  body('scheduledAt').optional({ nullable: true }).isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date.'),
];

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/teacher/content
 * @desc    Get all of teacher's own content
 */
router.get('/content', teacherController.getMyContent);

/**
 * @route   POST /api/teacher/content
 * @desc    Create a new content draft
 */
router.post('/content', createContentValidation, validate, teacherController.createContent);

/**
 * @route   GET /api/teacher/content/:id
 * @desc    Get a specific content item (must be teacher's own)
 */
router.get('/content/:id', [param('id').isUUID()], validate, teacherController.getContentById);

/**
 * @route   PUT /api/teacher/content/:id
 * @desc    Update a content draft or rejected content
 */
router.put('/content/:id', updateContentValidation, validate, teacherController.updateContent);

/**
 * @route   POST /api/teacher/content/:id/submit
 * @desc    Submit content for principal review
 */
router.post('/content/:id/submit', submitValidation, validate, teacherController.submitForReview);

/**
 * @route   DELETE /api/teacher/content/:id
 * @desc    Delete a draft content item
 */
router.delete('/content/:id', [param('id').isUUID()], validate, teacherController.deleteContent);

module.exports = router;
