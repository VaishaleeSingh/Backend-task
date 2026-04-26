'use strict';

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  (process.env.DB_NAME || 'content_broadcasting_db').trim(),
  (process.env.DB_USER || 'root').trim(),
  (process.env.DB_PASSWORD || '').trim(),
  {
    host: (process.env.DB_HOST || 'localhost').trim(),
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      ssl: process.env.DB_HOST === 'localhost' ? false : {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    },
    logging: (msg) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(msg);
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true, // soft deletes via deletedAt
    },
  }
);

module.exports = { sequelize };
