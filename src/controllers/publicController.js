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

  /**
   * GET /api/public/live/:teacherId - Get live rotating content for a specific teacher
   */
  async getTeacherLiveContent(req, res, next) {
    try {
      const liveContent = await contentService.getLiveContentForTeacher(req.params.teacherId);
      
      if (!liveContent || liveContent.length === 0) {
        return successResponse(res, {
          message: 'No content available',
          data: []
        });
      }

      return successResponse(res, {
        message: 'Live rotating content retrieved successfully.',
        data: liveContent,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PublicController();
