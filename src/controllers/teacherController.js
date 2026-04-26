'use strict';

const contentService = require('../services/contentService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/responseHelper');

class TeacherController {
  /**
   * POST /api/teacher/content - Create new content draft
   */
  async createContent(req, res, next) {
    try {
      const { title, description, contentType, contentUrl, contentBody, subject, gradeLevel, tags } = req.body;
      const content = await contentService.createContent({
        teacherId: req.user.id,
        title,
        description,
        contentType,
        contentUrl,
        contentBody,
        subject,
        gradeLevel,
        tags,
      });
      return createdResponse(res, {
        message: 'Content draft created successfully.',
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/teacher/content/:id - Update content draft
   */
  async updateContent(req, res, next) {
    try {
      const content = await contentService.updateContent({
        contentId: req.params.id,
        teacherId: req.user.id,
        updates: req.body,
      });
      return successResponse(res, { message: 'Content updated successfully.', data: content });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/teacher/content/:id/submit - Submit for principal review
   */
  async submitForReview(req, res, next) {
    try {
      const { scheduledAt } = req.body;
      const content = await contentService.submitForReview({
        contentId: req.params.id,
        teacherId: req.user.id,
        scheduledAt,
      });
      return successResponse(res, {
        message: 'Content submitted for principal review.',
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/teacher/content/:id - Delete draft
   */
  async deleteContent(req, res, next) {
    try {
      const result = await contentService.deleteContent({
        contentId: req.params.id,
        teacherId: req.user.id,
      });
      return successResponse(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/teacher/content - List teacher's content
   */
  async getMyContent(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const result = await contentService.getTeacherContent({
        teacherId: req.user.id,
        status,
        page,
        limit,
      });
      return paginatedResponse(res, {
        message: 'Your content retrieved successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/teacher/content/:id - Get single content item
   */
  async getContentById(req, res, next) {
    try {
      const content = await contentService.getContentById(req.params.id, req.user);
      return successResponse(res, { message: 'Content retrieved.', data: content });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeacherController();
