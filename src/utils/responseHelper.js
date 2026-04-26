'use strict';

/**
 * Standard API response helpers.
 */

const successResponse = (res, { message = 'Success', data = null, statusCode = 200, meta = null }) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const createdResponse = (res, { message = 'Created successfully', data = null }) => {
  return successResponse(res, { message, data, statusCode: 201 });
};

const errorResponse = (res, { message = 'An error occurred', statusCode = 400, errors = null }) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, { message = 'Success', data, page, limit, total }) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  paginatedResponse,
};
