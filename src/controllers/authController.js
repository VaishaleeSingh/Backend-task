'use strict';

const authService = require('../services/authService');
const { successResponse, createdResponse } = require('../utils/responseHelper');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      // Public registration: only 'student' role; role override needs principal privileges
      const allowedRole = 'student';
      const result = await authService.register({ name, email, password, role: allowedRole });
      return createdResponse(res, { message: 'Registration successful.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async registerTeacher(req, res, next) {
    try {
      // Called by principal to register teachers
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password, role: 'teacher' });
      return createdResponse(res, { message: 'Teacher account created successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await authService.login({ email, password, ipAddress });
      return successResponse(res, { message: 'Login successful.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return successResponse(res, { message: 'Token refreshed successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.id);
      return successResponse(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return successResponse(res, { message: 'Profile retrieved successfully.', data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword({
        userId: req.user.id,
        currentPassword,
        newPassword,
      });
      return successResponse(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
