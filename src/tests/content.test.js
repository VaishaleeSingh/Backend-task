'use strict';

require('./setup');

const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../database/connection');
const { User, Content } = require('../models/index');

let principalToken, teacherToken, teacher2Token;
let principalId, teacherId, teacher2Id;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Create principal
  const principalRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'prin@test.com', password: 'password123' })
    .catch(() => null);

  // Register test users directly
  const principal = await User.create({
    name: 'Test Principal',
    email: 'prin@test.com',
    password: 'password123',
    role: 'principal',
  });
  principalId = principal.id;

  const teacher = await User.create({
    name: 'Test Teacher',
    email: 'teach@test.com',
    password: 'password123',
    role: 'teacher',
  });
  teacherId = teacher.id;

  const teacher2 = await User.create({
    name: 'Test Teacher 2',
    email: 'teach2@test.com',
    password: 'password123',
    role: 'teacher',
  });
  teacher2Id = teacher2.id;

  // Login to get tokens
  const pLogin = await request(app).post('/api/auth/login').send({ email: 'prin@test.com', password: 'password123' });
  principalToken = pLogin.body.data.accessToken;

  const tLogin = await request(app).post('/api/auth/login').send({ email: 'teach@test.com', password: 'password123' });
  teacherToken = tLogin.body.data.accessToken;

  const t2Login = await request(app).post('/api/auth/login').send({ email: 'teach2@test.com', password: 'password123' });
  teacher2Token = t2Login.body.data.accessToken;
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await Content.destroy({ where: {}, force: true });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const createDraft = async (token = teacherToken, overrides = {}) => {
  return request(app)
    .post('/api/teacher/content')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Content Title',
      description: 'A test description',
      contentType: 'announcement',
      subject: 'Math',
      gradeLevel: 'Grade 10',
      ...overrides,
    });
};

describe('Content Workflow API', () => {
  // ─── Teacher: Create Content ───────────────────────────────────────────────

  describe('POST /api/teacher/content', () => {
    it('should create a content draft as teacher', async () => {
      const res = await createDraft();
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.title).toBe('Test Content Title');
    });

    it('should reject content creation by student', async () => {
      const studentReg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Stu', email: 'stu@test.com', password: 'password123' });
      const studentToken = studentReg.body.data.accessToken;

      const res = await request(app)
        .post('/api/teacher/content')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked', contentType: 'announcement' });

      expect(res.statusCode).toBe(403);
    });

    it('should reject content without a title', async () => {
      const res = await request(app)
        .post('/api/teacher/content')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ contentType: 'announcement' });

      expect(res.statusCode).toBe(422);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/teacher/content').send({ title: 'Test' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Teacher: Update Content ───────────────────────────────────────────────

  describe('PUT /api/teacher/content/:id', () => {
    it('should update a draft content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;

      const res = await request(app)
        .put(`/api/teacher/content/${contentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'Updated Title' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should not allow updating another teacher\'s content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;

      const res = await request(app)
        .put(`/api/teacher/content/${contentId}`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({ title: 'Stolen' });

      expect(res.statusCode).toBe(404); // Not found from teacher2's perspective
    });
  });

  // ─── Teacher: Submit for Review ────────────────────────────────────────────

  describe('POST /api/teacher/content/:id/submit', () => {
    it('should submit draft content for review', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;

      const res = await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('pending_approval');
    });

    it('should accept a future scheduledAt date', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ scheduledAt: future });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('pending_approval');
    });

    it('should reject past scheduledAt date', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ scheduledAt: past });

      expect(res.statusCode).toBe(400);
    });

    it('should not allow submitting already-submitted content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;

      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(res.statusCode).toBe(409);
    });
  });

  // ─── Principal: Approve Content ────────────────────────────────────────────

  describe('PATCH /api/principal/content/:id/approve', () => {
    it('should approve pending content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .patch(`/api/principal/content/${contentId}/approve`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({ reviewNotes: 'Great content!' });

      expect(res.statusCode).toBe(200);
      // No schedule = immediately live
      expect(['approved', 'live']).toContain(res.body.data.status);
    });

    it('should not allow teacher to approve content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .patch(`/api/principal/content/${contentId}/approve`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── Principal: Reject Content ─────────────────────────────────────────────

  describe('PATCH /api/principal/content/:id/reject', () => {
    it('should reject pending content with review notes', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .patch(`/api/principal/content/${contentId}/reject`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({ reviewNotes: 'Content needs more detail and proper citations.' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('should require review notes to reject', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .patch(`/api/principal/content/${contentId}/reject`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({});

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── Public: Live Content ──────────────────────────────────────────────────

  describe('GET /api/public/content', () => {
    beforeEach(async () => {
      // Directly insert a live content item
      await Content.create({
        teacher_id: teacherId,
        title: 'Live Public Content',
        content_type: 'announcement',
        content_body: 'This is live!',
        subject: 'Science',
        grade_level: 'Grade 8',
        status: 'live',
        reviewed_by: principalId,
        published_at: new Date(),
      });
    });

    it('should return live content without authentication', async () => {
      const res = await request(app).get('/api/public/content');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should support filtering by subject', async () => {
      const res = await request(app).get('/api/public/content?subject=Science');
      expect(res.statusCode).toBe(200);
      res.body.data.forEach((item) => {
        expect(item.subject).toBe('Science');
      });
    });

    it('should support search', async () => {
      const res = await request(app).get('/api/public/content?search=Live');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/public/content?page=1&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  // ─── Teacher: Delete Content ───────────────────────────────────────────────

  describe('DELETE /api/teacher/content/:id', () => {
    it('should delete a draft content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;

      const res = await request(app)
        .delete(`/api/teacher/content/${contentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);

      // Verify it's gone
      const check = await request(app)
        .get(`/api/teacher/content/${contentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(check.statusCode).toBe(404);
    });

    it('should not allow deleting submitted/pending content', async () => {
      const draft = await createDraft();
      const contentId = draft.body.data.id;
      await request(app)
        .post(`/api/teacher/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      const res = await request(app)
        .delete(`/api/teacher/content/${contentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(409);
    });
  });
});
