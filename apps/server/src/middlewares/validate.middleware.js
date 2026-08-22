import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req against a zod schema shaped { body?, query?, params? }.
 * Parsed values replace the originals so handlers get typed/coerced data.
 */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    return next(ApiError.badRequest('Validation failed', details));
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;
  // req.query is a getter in Express 5; only reassign properties we parsed
  if (result.data.query) Object.assign(req.query, result.data.query);
  next();
};
