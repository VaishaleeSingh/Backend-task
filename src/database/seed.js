'use strict';

/**
 * Database Seed Script
 * Populates the database with initial test data.
 * Run: node src/database/seed.js
 *
 * WARNING: This will delete existing data in seeded tables.
 */

require('dotenv').config();
const { sequelize } = require('./connection');
const { User, Content, AuditLog } = require('../models/index');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seed...');
    await sequelize.authenticate();

    // Sync tables
    await sequelize.sync({ alter: true });

    // Clean existing data (order matters for FK constraints)
    await AuditLog.destroy({ where: {}, force: true });
    await Content.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    console.log('🗑️  Existing data cleared.');

    // ─── Create Users ─────────────────────────────────────────────────────────
    const principal = await User.create({
      name: 'Dr. Sarah Johnson',
      email: 'principal@school.edu',
      password: 'Principal@123',
      role: 'principal',
    });

    const teacher1 = await User.create({
      name: 'Mr. Alex Carter',
      email: 'alex.carter@school.edu',
      password: 'Teacher@123',
      role: 'teacher',
    });

    const teacher2 = await User.create({
      name: 'Ms. Priya Sharma',
      email: 'priya.sharma@school.edu',
      password: 'Teacher@123',
      role: 'teacher',
    });

    const student = await User.create({
      name: 'Jamie Lee',
      email: 'jamie.lee@students.edu',
      password: 'Student@123',
      role: 'student',
    });

    console.log('👤 Users created: principal, 2 teachers, 1 student');

    // ─── Create Content in Various States ────────────────────────────────────

    // Live content (already approved and published)
    const liveContent1 = await Content.create({
      teacher_id: teacher1.id,
      title: 'Introduction to Algebra - Grade 9',
      description: 'A comprehensive introduction to algebraic concepts for Grade 9 students.',
      content_type: 'video',
      content_url: 'https://example.com/videos/algebra-intro-g9',
      subject: 'Mathematics',
      grade_level: 'Grade 9',
      status: 'live',
      reviewed_by: principal.id,
      review_notes: 'Excellent content. Approved.',
      reviewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ['algebra', 'grade-9', 'mathematics'],
      view_count: 150,
    });

    const liveContent2 = await Content.create({
      teacher_id: teacher2.id,
      title: 'Science Announcement: Lab Safety Rules',
      description: 'Important announcement about updated lab safety protocols.',
      content_type: 'announcement',
      content_body: 'All students must wear safety goggles at all times in the lab. Failure to comply will result in removal from the lab session. This rule takes effect immediately.',
      subject: 'Science',
      grade_level: 'All',
      status: 'live',
      reviewed_by: principal.id,
      review_notes: 'Critical safety information. Approved immediately.',
      reviewed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      tags: ['safety', 'lab', 'science'],
      view_count: 423,
    });

    // Pending approval
    const pendingContent1 = await Content.create({
      teacher_id: teacher1.id,
      title: 'Geometry Fundamentals Quiz - Chapter 3',
      description: 'Assessment quiz covering triangles, circles, and polygons.',
      content_type: 'quiz',
      content_url: 'https://example.com/quizzes/geometry-ch3',
      subject: 'Mathematics',
      grade_level: 'Grade 10',
      status: 'pending_approval',
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      tags: ['geometry', 'quiz', 'grade-10'],
    });

    const pendingContent2 = await Content.create({
      teacher_id: teacher2.id,
      title: 'Photosynthesis - Detailed Study Guide',
      description: 'Comprehensive study guide with diagrams and practice problems.',
      content_type: 'document',
      content_url: 'https://example.com/docs/photosynthesis-guide',
      subject: 'Biology',
      grade_level: 'Grade 11',
      status: 'pending_approval',
      tags: ['photosynthesis', 'biology', 'grade-11'],
    });

    // Draft content
    await Content.create({
      teacher_id: teacher1.id,
      title: 'Advanced Trigonometry - Draft',
      description: 'Work in progress - trig identities and applications.',
      content_type: 'video',
      subject: 'Mathematics',
      grade_level: 'Grade 12',
      status: 'draft',
      tags: ['trigonometry', 'grade-12'],
    });

    // Rejected content
    await Content.create({
      teacher_id: teacher2.id,
      title: 'Physics Experiment - Outdated Procedures',
      description: 'Experiment guide using outdated safety procedures.',
      content_type: 'document',
      subject: 'Physics',
      grade_level: 'Grade 11',
      status: 'rejected',
      reviewed_by: principal.id,
      review_notes: 'This document references outdated lab procedures that do not comply with current safety standards. Please update sections 3 and 4 before resubmitting.',
      reviewed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ['physics', 'experiment'],
    });

    console.log('📄 Content created: 2 live, 2 pending, 1 draft, 1 rejected');

    // ─── Seed Some Audit Logs ─────────────────────────────────────────────────
    await AuditLog.bulkCreate([
      {
        actor_id: principal.id,
        actor_role: 'principal',
        action: 'CONTENT_APPROVED',
        entity_type: 'Content',
        entity_id: liveContent1.id,
        details: { title: liveContent1.title },
      },
      {
        actor_id: teacher1.id,
        actor_role: 'teacher',
        action: 'CONTENT_SUBMITTED',
        entity_type: 'Content',
        entity_id: pendingContent1.id,
        details: { title: pendingContent1.title },
      },
      {
        actor_id: null,
        actor_role: 'system',
        action: 'SCHEDULER_INITIALIZED',
        entity_type: null,
        entity_id: null,
        details: { message: 'Content auto-publish scheduler started' },
      },
    ]);

    console.log('📋 Audit logs seeded.');

    console.log('\n✅ Seed complete! Test credentials:');
    console.log('─────────────────────────────────────────────────');
    console.log('Principal: principal@school.edu / Principal@123');
    console.log('Teacher 1: alex.carter@school.edu / Teacher@123');
    console.log('Teacher 2: priya.sharma@school.edu / Teacher@123');
    console.log('Student:   jamie.lee@students.edu / Student@123');
    console.log('─────────────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seedData();
