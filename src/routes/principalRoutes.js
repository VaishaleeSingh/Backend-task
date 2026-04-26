'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const principalController = require('../controllers/principalController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All principal routes require authentication + principal role
router.use(authenticate);
router.use(authorize('principal'));

// ─── Validation chains ───────────────────────────────────────────────────────

const approveValidation = [
  param('id').isUUID().withMessage('Content ID must be a valid UUID.'),
  body('reviewNotes').optional().isString(),
  body('scheduledAt').optional({ nullable: true }).isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date.'),
];

const rejectValidation = [
  param('id').isUUID().withMessage('Content ID must be a valid UUID.'),
  body('reviewNotes').notEmpty().withMessage('Review notes are required when rejecting content.')
    .isLength({ min: 10 }).withMessage('Review notes must be at least 10 characters.'),
];

const takedownValidation = [
  param('id').isUUID().withMessage('Content ID must be a valid UUID.'),
  body('reason').optional().isString(),
];

const createTeacherValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

// ─── Content Management Routes ───────────────────────────────────────────────

/** GET /api/principal/content - All content with filters */
router.get('/content', principalController.getAllContent);

/** GET /api/principal/content/pending - Pending review queue */
router.get('/content/pending', principalController.getPendingContent);

/** GET /api/principal/content/:id - Content detail */
router.get('/content/:id', [param('id').isUUID()], validate, principalController.getContentById);

/** PATCH /api/principal/content/:id/approve - Approve content */
router.patch('/content/:id/approve', approveValidation, validate, principalController.approveContent);

/** PATCH /api/principal/content/:id/reject - Reject content */
router.patch('/content/:id/reject', rejectValidation, validate, principalController.rejectContent);

/** PATCH /api/principal/content/:id/takedown - Take down live content */
router.patch('/content/:id/takedown', takedownValidation, validate, principalController.takeDownContent);

// ─── Stats & Dashboard ───────────────────────────────────────────────────────

/** GET /api/principal/stats - Dashboard stats */
router.get('/stats', principalController.getStats);

// ─── User Management Routes ──────────────────────────────────────────────────

/** POST /api/principal/teachers - Create a teacher account */
router.post('/teachers', createTeacherValidation, validate, principalController.createTeacher);

/** GET /api/principal/teachers - List all teachers */
router.get('/teachers', principalController.getAllTeachers);

/** PATCH /api/principal/users/:id/deactivate - Deactivate user */
router.patch('/users/:id/deactivate', [param('id').isUUID()], validate, principalController.deactivateUser);

/** PATCH /api/principal/users/:id/reactivate - Reactivate user */
router.patch('/users/:id/reactivate', [param('id').isUUID()], validate, principalController.reactivateUser);

// ─── Audit Log Routes ────────────────────────────────────────────────────────

/** GET /api/principal/audit-logs - View audit trail */
router.get('/audit-logs', principalController.getAuditLogs);

module.exports = router;
