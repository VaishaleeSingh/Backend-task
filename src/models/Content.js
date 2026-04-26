'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * Content Model
 *
 * Lifecycle states:
 *   draft -> pending_approval -> approved -> live
 *                            -> rejected
 *
 * A Teacher uploads content (draft), submits for review (pending_approval).
 * Principal approves (approved) or rejects (rejected).
 * Scheduler auto-transitions approved content to live at scheduled_at time.
 * Principal can also manually take down live content.
 */
const Content = sequelize.define('Content', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title cannot be empty' },
      len: { args: [3, 255], msg: 'Title must be between 3 and 255 characters' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content_type: {
    type: DataTypes.ENUM('video', 'document', 'quiz', 'announcement', 'assignment'),
    allowNull: false,
    defaultValue: 'announcement',
  },
  content_url: {
    type: DataTypes.STRING(2048),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Content URL must be a valid URL' },
    },
    comment: 'URL to the actual content resource (video link, document link, etc.)',
  },
  content_body: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Inline content body (for announcements, text-based content)',
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  grade_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Target grade level, e.g., Grade 10, All, etc.',
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'live', 'taken_down'),
    allowNull: false,
    defaultValue: 'draft',
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When approved content should go live',
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Actual timestamp when content went live',
  },
  taken_down_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Foreign keys (set via associations)
  teacher_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Principal notes on approval/rejection',
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of string tags for searchability',
  },
}, {
  tableName: 'contents',
  indexes: [
    { fields: ['status'] },
    { fields: ['teacher_id'] },
    { fields: ['scheduled_at'] },
    { fields: ['content_type'] },
    { fields: ['subject'] },
  ],
});

module.exports = Content;
