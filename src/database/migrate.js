'use strict';
console.log('--- Migration Script Entry ---');

/**
 * Database Migration Script
 * Creates all tables in the correct order.
 * Run: node src/database/migrate.js
 */

require('dotenv').config();
const { sequelize } = require('./connection');

// Import models to register them
require('../models/index');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful.');

    // Force: false preserves data; alter: true updates schema
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ All tables created/updated successfully.');

    console.log('\nTable summary:');
    console.log('  - users');
    console.log('  - contents');
    console.log('  - audit_logs');
    console.log('  - content_slots');
    console.log('  - content_schedules');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
