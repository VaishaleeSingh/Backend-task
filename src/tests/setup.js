'use strict';

require('dotenv').config();

// Override DB name for testing to avoid corrupting development data
process.env.DB_NAME = 'content_broadcasting_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_32chars';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
