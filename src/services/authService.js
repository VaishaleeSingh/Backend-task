'use strict';

const { User } = require('../models');
const { buildTokenResponse, verifyRefreshToken } = require('../utils/jwtHelper');
const { audit } = require('../utils/auditLogger');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user.
   * Assumption: Only principals can register teachers via admin flow.
   * Public registration creates students by default.
   */
  async register({ name, email, password, role = 'student' }) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const user = await User.create({ name, email, password, role });

    const tokenData = buildTokenResponse(user);
    await user.update({ refresh_token: tokenData.refreshToken });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      details: { email, role },
    });

    return tokenData;
  }

  /**
   * Authenticate user with email + password.
   */
  async login({ email, password, ipAddress }) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Your account has been deactivated. Contact an administrator.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      await audit({
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        details: { reason: 'Invalid password' },
        ipAddress,
      });

      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    const tokenData = buildTokenResponse(user);

    // Store refresh token hash (storing plaintext for simplicity; in production, store a hash)
    await user.update({
      refresh_token: tokenData.refreshToken,
      last_login: new Date(),
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return tokenData;
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token. Please log in again.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refreshToken) {
      const error = new Error('Refresh token is invalid or has been revoked.');
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Account is deactivated.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    const tokenData = buildTokenResponse(user);
    await user.update({ refresh_token: tokenData.refreshToken });

    return tokenData;
  }

  /**
   * Logout user by invalidating their refresh token.
   */
  async logout(userId) {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ refresh_token: null });

      await audit({
        actorId: userId,
        actorRole: user.role,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: userId,
      });
    }
    return { message: 'Logged out successfully.' };
  }

  /**
   * Get current user's profile.
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'refresh_token', 'deleted_at'] },
    });

    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return user;
  }

  /**
   * Change password.
   */
  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      const error = new Error('Current password is incorrect.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    await user.update({ password: newPassword, refresh_token: null });

    await audit({
      actorId: userId,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }
}

module.exports = new AuthService();
