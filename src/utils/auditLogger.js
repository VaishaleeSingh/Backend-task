'use strict';

const { AuditLog } = require('../models');
const logger = require('./logger');

/**
 * Create an audit log entry. Fire-and-forget (non-blocking).
 *
 * @param {Object} params
 * @param {string|null} params.actorId - User ID performing the action
 * @param {string} params.actorRole - Role of the actor (or 'system')
 * @param {string} params.action - Action code, e.g., 'CONTENT_APPROVED'
 * @param {string|null} params.entityType - e.g., 'Content', 'User'
 * @param {string|null} params.entityId - ID of the affected entity
 * @param {Object|null} params.details - Additional context
 * @param {string|null} params.ipAddress - Client IP
 */
const audit = async ({
  actorId = null,
  actorRole = 'system',
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
}) => {
  try {
    await AuditLog.create({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
    });
  } catch (error) {
    // Non-critical: log the error but don't propagate
    logger.error('Failed to write audit log:', { action, actorId, error: error.message });
  }
};

module.exports = { audit };
