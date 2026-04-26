'use strict';

const { User } = require('../models');
const { audit } = require('../utils/auditLogger');

class UserManagementService {
  /**
   * Principal creates a teacher account.
   * Assumption: Teachers are invited/created by the principal, not self-registered.
   */
  async createTeacher({ name, email, principalId }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const error = new Error('A user with this email already exists.');
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // Default password: teachers must change on first login (in production, send email invite)
    const tempPassword = `Teacher@${Math.random().toString(36).slice(2, 10)}`;

    const teacher = await User.create({
      name,
      email,
      password: tempPassword,
      role: 'teacher',
    });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'TEACHER_CREATED',
      entityType: 'User',
      entityId: teacher.id,
      details: { email, name },
    });

    return {
      user: teacher.toSafeJSON(),
      temporaryPassword: tempPassword, // In production: send via secure email
      message: 'Teacher account created. Share the temporary password securely.',
    };
  }

  /**
   * Principal gets all teachers.
   */
  async getAllTeachers({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['password', 'refresh_token', 'deleted_at'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Principal deactivates a user account.
   */
  async deactivateUser({ userId, principalId }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (user.role === 'principal') {
      const error = new Error('Cannot deactivate a principal account.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    await user.update({ is_active: false, refresh_token: null });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: userId,
    });

    return { message: `User ${user.name} has been deactivated.` };
  }

  /**
   * Principal reactivates a user account.
   */
  async reactivateUser({ userId, principalId }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await user.update({ is_active: true });

    await audit({
      actorId: principalId,
      actorRole: 'principal',
      action: 'USER_REACTIVATED',
      entityType: 'User',
      entityId: userId,
    });

    return { message: `User ${user.name} has been reactivated.` };
  }
}

module.exports = new UserManagementService();
