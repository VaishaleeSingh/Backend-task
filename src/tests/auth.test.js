'use strict';

require('./setup');

const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../database/connection');
const { User } = require('../models/index');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await User.destroy({ where: {}, force: true });
});

describe('Auth API', () => {
  // ─── Registration ──────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new student successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test Student', email: 'student@test.com', password: 'password123' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@test.com', password: '123' });

      expect(res.statusCode).toBe(422);
    });

    it('should reject duplicate email registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'First', email: 'dup@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Second', email: 'dup@test.com', password: 'password123' });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Login Test User',
        email: 'login@test.com',
        password: 'password123',
        role: 'student',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.tokenType).toBe('Bearer');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── Token Refresh ─────────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Refresh Test', email: 'refresh@test.com', password: 'password123' });

      const { refreshToken } = loginRes.body.data;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── Profile ───────────────────────────────────────────────────────────────

  describe('GET /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Profile User', email: 'profile@test.com', password: 'password123' });
      accessToken = res.body.data.accessToken;
    });

    it('should return profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe('profile@test.com');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should reject profile access without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.statusCode).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Logout User', email: 'logout@test.com', password: 'password123' });

      const { accessToken } = regRes.body.data;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
