import { ApiError } from '../utils/ApiError.js';
import { fail } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return fail(res, err.statusCode, err.message, err.details);
  }

  // Mongoose duplicate key
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    return fail(res, 409, `Duplicate value for: ${fields}`);
  }

  // Mongoose validation
  if (err?.name === 'ValidationError') {
    return fail(res, 400, 'Validation failed', Object.values(err.errors).map((e) => e.message));
  }

  logger.error({ err, url: req.originalUrl }, 'Unhandled error');
  return fail(res, 500, env.isProduction ? 'Internal server error' : err.message);
}
