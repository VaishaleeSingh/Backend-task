'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./database/connection');
const logger = require('./utils/logger');
const { startScheduler } = require('./services/schedulerService');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully.');

    // Sync models (in development; use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database models synchronized.');
    }

    // Start the content scheduler (auto-publish approved content)
    startScheduler();
    logger.info('✅ Content scheduler started.');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Content Broadcasting System running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();
