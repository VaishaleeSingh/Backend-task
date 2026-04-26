'use strict';

const contentService = require('../services/contentService');
const userService = require('../services/userService');
const { AuditLog, User } = require('../models');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/responseHelper');

class PrincipalController {
  // ─── Content Review ────────────────────────────────────────────────────────

  /**
   * GET /api/principal/content - View all content (all statuses)
   */
  async getAllContent(req, res, next) {
    try {
      const { status, contentType, teacherId, subject, page = 1, limit = 10 } = req.query;
      const result = await contentService.getAllContent({ status, contentType, teacherId, subject, page, limit });
      return paginatedResponse(res, { message: 'Content retrieved.', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/principal/content/pending - View pending review queue
   */
  async getPendingContent(req, res, next) {
    try {
      const { page = 1, limit = 10, contentType, subject } = req.query;
      const result = await contentService.getPendingContent({ page, limit, contentType, subject });
      return paginatedResponse(res, { message: 'Pending content review queue.', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/principal/content/:id - Get content detail
   */
  async getContentById(req, res, next) {
    try {
      const content = await contentService.getContentById(req.params.id, req.user);
      return successResponse(res, { message: 'Content retrieved.', data: content });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/principal/content/:id/approve - Approve content
   */
  async approveContent(req, res, next) {
    try {
      const { reviewNotes, scheduledAt } = req.body;
      const content = await contentService.approveContent({
        contentId: req.params.id,
        principalId: req.user.id,
        reviewNotes,
        scheduledAt,
      });
      return successResponse(res, { message: 'Content approved successfully.', data: content });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/principal/content/:id/reject - Reject content
   */
  async rejectContent(req, res, next) {
    try {
      const { reviewNotes } = req.body;
      const content = await contentService.rejectContent({
        contentId: req.params.id,
        principalId: req.user.id,
        reviewNotes,
      });
      return successResponse(res, { message: 'Content rejected.', data: content });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/principal/content/:id/takedown - Take down live content
   */
  async takeDownContent(req, res, next) {
    try {
      const { reason } = req.body;
      const content = await contentService.takeDownContent({
        contentId: req.params.id,
        principalId: req.user.id,
        reason,
      });
      return successResponse(res, { message: 'Content taken down.', data: content });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dashboard & Stats ─────────────────────────────────────────────────────

  /**
   * GET /api/principal/stats - Dashboard statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await contentService.getStats();
      return successResponse(res, { message: 'Dashboard statistics.', data: stats });
    } catch (error) {
      next(error);
    }
  }

  // ─── User Management ───────────────────────────────────────────────────────

  /**
   * POST /api/principal/teachers - Create teacher account
   */
  async createTeacher(req, res, next) {
    try {
      const { name, email } = req.body;
      const result = await userService.createTeacher({ name, email, principalId: req.user.id });
      return createdResponse(res, { message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/principal/teachers - List all teachers
   */
  async getAllTeachers(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await userService.getAllTeachers({ page, limit });
      return paginatedResponse(res, { message: 'Teachers retrieved.', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/principal/users/:id/deactivate - Deactivate user
   */
  async deactivateUser(req, res, next) {
    try {
      const result = await userService.deactivateUser({ userId: req.params.id, principalId: req.user.id });
      return successResponse(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/principal/users/:id/reactivate - Reactivate user
   */
  async reactivateUser(req, res, next) {
    try {
      const result = await userService.reactivateUser({ userId: req.params.id, principalId: req.user.id });
      return successResponse(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────────

  /**
   * GET /api/principal/audit-logs - View system audit logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { action, actorId, entityType, page = 1, limit = 20 } = req.query;
      const where = {};
      if (action) where.action = action;
      if (actorId) where.actor_id = actorId;
      if (entityType) where.entity_type = entityType;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'role'], required: false }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset,
      });

      return paginatedResponse(res, {
        message: 'Audit logs retrieved.',
        data: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrincipalController();
