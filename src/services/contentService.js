'use strict';

const { Op } = require('sequelize');
const { Content, User } = require('../models');
const { audit } = require('../utils/auditLogger');

class ContentService {
  /**
   * Create a new content draft.
   * Only teachers can create content.
   */
  async createContent({ teacherId, title, description, contentType, contentUrl, contentBody, subject, gradeLevel, tags }) {
    const content = await Content.create({
      teacher_id: teacherId,
      title,
      description,
      content_type: contentType || 'announcement',
      content_url: contentUrl || null,
      content_body: contentBody || null,
      subject: subject || null,
      grade_level: gradeLevel || null,
      status: 'draft',
      tags: tags || [],
    });

    await audit({
      actorId: teacherId,
      actorRole: 'teacher',
      action: 'CONTENT_CREATED',
      entityType: 'Content',
      entityId: content.id,
      details: { title, contentType },
    });

    return content;
  }

  /**
   * Update a content draft (teacher-owned, only in draft status).
   */
  async updateContent({ contentId, teacherId, updates }) {
    const content = await Content.findOne({
      where: { id: contentId, teacher_id: teacherId },
    });

    if (!content) {
      const error = new Error('Content not found or you do not own this content.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (!['draft', 'rejected'].includes(content.status)) {
      const error = new Error(`Content in "${content.status}" state cannot be edited. Only drafts and rejected content can be modified.`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const allowedUpdates = ['title', 'description', 'content_type', 'content_url', 'content_body', 'subject', 'grade_level', 'tags'];
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (updates[camelKey] !== undefined) filteredUpdates[key] = updates[camelKey];
      if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
    }

    // If previously rejected, move back to draft on edit
    if (content.status === 'rejected') {
      filteredUpdates.status = 'draft';
      filteredUpdates.review_notes = null;
      filteredUpdates.reviewed_by = null;
      filteredUpdates.reviewed_at = null;
    }

    await content.update(filteredUpdates);

    await audit({
      actorId: teacherId,
      actorRole: 'teacher',
      action: 'CONTENT_UPDATED',
      entityType: 'Content',
      entityId: contentId,
      details: { updatedFields: Object.keys(filteredUpdates) },
    });

    return content.reload({ include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }] });
  }

  /**
   * Submit content for principal review.
   * Optional: set scheduled broadcast time.
   */
  async submitForReview({ contentId, teacherId, scheduledAt }) {
    const content = await Content.findOne({
      where: { id: contentId, teacher_id: teacherId },
    });

    if (!content) {
      const error = new Error('Content not found or you do not own this content.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (content.status !== 'draft') {
      const error = new Error(`Cannot submit content with status "${content.status}". Only drafts can be submitted.`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // Validate scheduled_at if provided
    if (scheduledAt) {
      const schedDate = new Date(scheduledAt);
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        const error = new Error('scheduled_at must be a valid future date/time.');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }
    }

    await content.update({
      status: 'pending_approval',
      scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
    });

    await audit({
      actorId: teacherId,
      actorRole: 'teacher',
      action: 'CONTENT_SUBMITTED',
      entityType: 'Content',
      entityId: contentId,
      details: { scheduledAt },
    });

    return content;
  }

  /**
   * Delete a draft content (soft delete).
   */
  async deleteContent({ contentId, teacherId }) {
    const content = await Content.findOne({
      where: { id: contentId, teacher_id: teacherId },
    });

    if (!content) {
      const error = new Error('Content not found or you do not own this content.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (!['draft', 'rejected'].includes(content.status)) {
      const error = new Error(`Content in "${content.status}" state cannot be deleted. Contact principal to take it down.`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    await content.destroy(); // soft delete

    await audit({
      actorId: teacherId,
      actorRole: 'teacher',
      action: 'CONTENT_DELETED',
      entityType: 'Content',
      entityId: contentId,
    });

    return { message: 'Content deleted successfully.' };
  }

  /**
   * Get teacher's own content with filtering and pagination.
   */
  async getTeacherContent({ teacherId, status, page = 1, limit = 10 }) {
    const where = { teacher_id: teacherId };
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows } = await Content.findAndCountAll({
      where,
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Get a single content item (with ownership check for teachers).
   */
  async getContentById(contentId, user) {
    const where = { id: contentId };

    // Teachers can only see their own content
    if (user.role === 'teacher') {
      where.teacher_id = user.id;
    }

    const content = await Content.findOne({
      where,
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!content) {
      const error = new Error('Content not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return content;
  }

  /**
   * Principal: get all pending content for review.
   */
  async getPendingContent({ page = 1, limit = 10, contentType, subject }) {
    const where = { status: 'pending_approval' };
    if (contentType) where.content_type = contentType;
    if (subject) where.subject = subject;

    const offset = (page - 1) * limit;

    const { count, rows } = await Content.findAndCountAll({
      where,
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'ASC']], // FIFO review queue
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Principal: approve content.
   */
  async approveContent({ contentId, principalId, reviewNotes, scheduledAt }) {
    const content = await Content.findByPk(contentId);

    if (!content) {
      const error = new Error('Content not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (content.status !== 'pending_approval') {
      const error = new Error(`Only content in "pending_approval" status can be approved. Current status: "${content.status}".`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // If no schedule set yet, principal can set/override it
    const finalScheduledAt = scheduledAt
      ? new Date(scheduledAt)
      : content.scheduled_at || null;

    // If no schedule, make it live immediately
    const newStatus = finalScheduledAt ? 'approved' : 'live';
    const publishedAt = finalScheduledAt ? null : new Date();

    await content.update({
      status: newStatus,
      reviewed_by: principalId,
      review_notes: reviewNotes || null,
      reviewed_at: new Date(),
      scheduled_at: finalScheduledAt,
      published_at: publishedAt,
    });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'CONTENT_APPROVED',
      entityType: 'Content',
      entityId: contentId,
      details: { reviewNotes, scheduledAt: finalScheduledAt, immediatelyLive: !finalScheduledAt },
    });

    return content.reload({
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'] },
      ],
    });
  }

  /**
   * Principal: reject content.
   */
  async rejectContent({ contentId, principalId, reviewNotes }) {
    const content = await Content.findByPk(contentId);

    if (!content) {
      const error = new Error('Content not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (content.status !== 'pending_approval') {
      const error = new Error(`Only content in "pending_approval" status can be rejected. Current status: "${content.status}".`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    if (!reviewNotes || reviewNotes.trim().length < 10) {
      const error = new Error('Rejection requires review notes (at least 10 characters) explaining the reason.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    await content.update({
      status: 'rejected',
      reviewed_by: principalId,
      review_notes: reviewNotes,
      reviewed_at: new Date(),
    });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'CONTENT_REJECTED',
      entityType: 'Content',
      entityId: contentId,
      details: { reviewNotes },
    });

    return content.reload({
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'] },
      ],
    });
  }

  /**
   * Principal: take down live content.
   */
  async takeDownContent({ contentId, principalId, reason }) {
    const content = await Content.findByPk(contentId);

    if (!content) {
      const error = new Error('Content not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (content.status !== 'live') {
      const error = new Error(`Only "live" content can be taken down. Current status: "${content.status}".`);
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    await content.update({
      status: 'taken_down',
      taken_down_at: new Date(),
      review_notes: reason || content.review_notes,
    });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'CONTENT_TAKEN_DOWN',
      entityType: 'Content',
      entityId: contentId,
      details: { reason },
    });

    return content;
  }

  /**
   * Public: get all live content with filters and pagination.
   */
  async getLiveContent({ page = 1, limit = 10, contentType, subject, gradeLevel, search }) {
    const where = { status: 'live' };

    if (contentType) where.content_type = contentType;
    if (subject) where.subject = subject;
    if (gradeLevel) where.grade_level = gradeLevel;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Content.findAndCountAll({
      where,
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }],
      attributes: { exclude: ['content_body', 'review_notes', 'reviewed_by', 'reviewed_at', 'teacher_id', 'deleted_at'] },
      order: [['published_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Public: get a single live content item and increment view count.
   */
  async getLiveContentById(contentId) {
    const content = await Content.findOne({
      where: { id: contentId, status: 'live' },
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }],
    });

    if (!content) {
      const error = new Error('Content not found or is not publicly available.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // Increment view count (fire-and-forget)
    content.increment('view_count').catch(() => {});

    return content;
  }

  /**
   * Principal: get all content with full filters (dashboard view).
   */
  async getAllContent({ page = 1, limit = 10, status, contentType, teacherId, subject }) {
    const where = {};
    if (status) where.status = status;
    if (contentType) where.content_type = contentType;
    if (teacherId) where.teacher_id = teacherId;
    if (subject) where.subject = subject;

    const offset = (page - 1) * limit;

    const { count, rows } = await Content.findAndCountAll({
      where,
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Principal: get dashboard statistics.
   */
  async getStats() {
    const { sequelize } = require('../database/connection');
    const [results] = await sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM contents
      WHERE deleted_at IS NULL
      GROUP BY status
    `);

    const stats = {
      total: 0,
      draft: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      live: 0,
      taken_down: 0,
    };

    results.forEach((row) => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    const [teacherCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND deleted_at IS NULL
    `);

    const [topContent] = await sequelize.query(`
      SELECT id, title, view_count FROM contents 
      WHERE status = 'live' AND deleted_at IS NULL
      ORDER BY view_count DESC LIMIT 5
    `);

    return {
      contentStats: stats,
      totalTeachers: parseInt(teacherCount[0].count),
      topViewedContent: topContent,
    };
  }

  /**
   * Public: get live content for a specific teacher with rotation logic.
   * "Each subject has its own broadcast rotation" - Requirement
   */
  async getLiveContentForTeacher(teacherId) {
    const { ContentSchedule, ContentSlot } = require('../models');

    // 1. Get all active slots for this teacher
    const slots = await ContentSlot.findAll({
      where: { teacher_id: teacherId },
      include: [
        {
          model: ContentSchedule,
          include: [
            {
              model: Content,
              where: { status: 'live' },
            },
          ],
        },
      ],
    });

    if (!slots || slots.length === 0) {
      return [];
    }

    const liveContent = [];
    const nowMinutes = Math.floor(Date.now() / 60000);

    for (const slot of slots) {
      const schedules = slot.ContentSchedules || [];
      if (schedules.length === 0) continue;

      // Sort by rotation order
      const sortedSchedules = schedules.sort((a, b) => a.rotation_order - b.rotation_order);

      // Calculate total duration for this subject's cycle
      const totalDuration = sortedSchedules.reduce((acc, s) => acc + s.duration, 0);

      if (totalDuration === 0) continue;

      // Determine where we are in the cycle
      const currentMinuteInCycle = nowMinutes % totalDuration;

      // Find the active content based on the accumulated duration
      let accumulatedTime = 0;
      let activeSchedule = null;

      for (const schedule of sortedSchedules) {
        accumulatedTime += schedule.duration;
        if (currentMinuteInCycle < accumulatedTime) {
          activeSchedule = schedule;
          break;
        }
      }

      if (activeSchedule && activeSchedule.Content) {
        liveContent.push({
          subject: slot.subject,
          activeContent: {
            id: activeSchedule.Content.id,
            title: activeSchedule.Content.title,
            description: activeSchedule.Content.description,
            fileUrl: activeSchedule.Content.content_url,
            contentType: activeSchedule.Content.content_type,
          },
          rotationInfo: {
            duration: activeSchedule.duration,
            order: activeSchedule.rotation_order,
            totalCycleTime: totalDuration
          }
        });
      }
    }

    return liveContent;
  }
}

module.exports = new ContentService();
