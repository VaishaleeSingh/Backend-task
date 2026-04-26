'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * AuditLog Model
 * Records all significant actions in the system for accountability.
 */
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actor_id: {
    type: DataTypes.UUID,
    allowNull: true, // null for system actions
    references: { model: 'users', key: 'id' },
  },
  actor_role: {
    type: DataTypes.ENUM('principal', 'teacher', 'student', 'system'),
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g., CONTENT_SUBMITTED, CONTENT_APPROVED, USER_REGISTERED',
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'e.g., Content, User',
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context about the action',
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  paranoid: false, // Audit logs should never be soft-deleted
  updatedAt: false, // Logs are immutable
  indexes: [
    { fields: ['actor_id'] },
    { fields: ['action'] },
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = AuditLog;
