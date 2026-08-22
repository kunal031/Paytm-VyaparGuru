/** Every API response follows { success, data, error }. */
export function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, error: null });
}

export function fail(res, statusCode, message, details = undefined) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { message, ...(details ? { details } : {}) },
  });
}
