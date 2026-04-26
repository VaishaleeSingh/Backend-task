'use strict';

const contentService = require('../services/contentService');
const { successResponse, paginatedResponse } = require('../utils/responseHelper');

class PublicController {
  /**
   * GET /api/public/content - List all live content (no auth required)
   */
  async getLiveContent(req, res, next) {
    try {
      const { page = 1, limit = 10, contentType, subject, gradeLevel, search } = req.query;
      const result = await contentService.getLiveContent({
        page,
        limit,
        contentType,
        subject,
        gradeLevel,
        search,
      });
      return paginatedResponse(res, {
        message: 'Live content retrieved successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/public/content/:id - Get single live content item (no auth required)
   */
  async getLiveContentById(req, res, next) {
    try {
      const content = await contentService.getLiveContentById(req.params.id);
      return successResponse(res, {
        message: 'Content retrieved successfully.',
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PublicController();
