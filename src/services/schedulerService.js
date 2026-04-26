'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Content } = require('../models');
const { audit } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Scheduler Service
 *
 * Runs every minute to check for approved content whose scheduled_at
 * time has passed and transitions them to 'live' status.
 *
 * Assumption: Scheduler runs server-side; for distributed deployments,
 * a distributed lock (e.g., Redis) would be added to prevent duplicate processing.
 */
const startScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const contentToPublish = await Content.findAll({
        where: {
          status: 'approved',
          scheduled_at: { [Op.lte]: now },
        },
      });

      if (contentToPublish.length === 0) return;

      logger.info(`[Scheduler] Found ${contentToPublish.length} content item(s) to publish.`);

      for (const content of contentToPublish) {
        try {
          await content.update({
            status: 'live',
            published_at: now,
          });

          await audit({
            actorId: null,
            actorRole: 'system',
            action: 'CONTENT_AUTO_PUBLISHED',
            entityType: 'Content',
            entityId: content.id,
            details: {
              title: content.title,
              scheduledAt: content.scheduled_at,
              publishedAt: now,
            },
          });

          logger.info(`[Scheduler] Content "${content.title}" (${content.id}) is now LIVE.`);
        } catch (itemError) {
          logger.error(`[Scheduler] Failed to publish content ${content.id}:`, itemError.message);
        }
      }
    } catch (error) {
      logger.error('[Scheduler] Error during scheduled content check:', error.message);
    }
  });

  logger.info('[Scheduler] Content auto-publish scheduler initialized. Running every minute.');
};

module.exports = { startScheduler };
