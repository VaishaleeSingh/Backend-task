'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT access token.
 * @param {Object} payload - Data to embed (id, role, email)
 * @returns {string} Signed JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'content-broadcasting-system',
    audience: 'cbs-clients',
  });
};

/**
 * Generate a signed refresh token (longer-lived).
 * @param {Object} payload
 * @returns {string} Signed refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'content-broadcasting-system',
    audience: 'cbs-clients',
  });
};

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'content-broadcasting-system',
    audience: 'cbs-clients',
  });
};

/**
 * Build the standard token pair response.
 * @param {User} user
 * @returns {{ accessToken, refreshToken, user }}
 */
const buildTokenResponse = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    tokenType: 'Bearer',
    user: user.toSafeJSON ? user.toSafeJSON() : user,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenResponse,
};
