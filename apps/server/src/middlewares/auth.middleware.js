import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { Merchant } from '../models/Merchant.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing authentication token');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const account = await Merchant.findById(payload.sub);
  if (!account) throw ApiError.unauthorized('Merchant no longer exists');

  // Authorization model: staff accounts operate on their owner's business data.
  // req.merchant is always the BUSINESS (data scope); req.authUser is who is
  // actually logged in (carries the role).
  req.authUser = account;
  if (account.role === 'staff' && account.staffOf) {
    const owner = await Merchant.findById(account.staffOf);
    if (!owner) throw ApiError.unauthorized('This staff account is orphaned — the business no longer exists');
    req.merchant = owner;
  } else {
    req.merchant = account;
  }
  next();
});

/** Route guard: only the given role may pass (use after requireAuth). */
export const requireRole = (role) => (req, _res, next) => {
  if ((req.authUser?.role ?? 'owner') !== role) {
    throw ApiError.forbidden(`Only the ${role} can perform this action`);
  }
  next();
};
