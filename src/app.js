'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const principalRoutes = require('./routes/principalRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Error handler
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

app.use('/api/', (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  globalLimiter(req, res, next);
});

app.use('/api/auth/', (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  authLimiter(req, res, next);
});

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Content Broadcasting System is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Content Broadcasting System API',
    version: '1.0.0',
    docs: '/api/public/content',
    health: '/api/health'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/public', publicRoutes);

// Specific alias to match assignment requirement exactly (e.g. /content/live/:teacherId)
app.use('/content', publicRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
