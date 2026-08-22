import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { BCRYPT_SALT_ROUNDS } from '../config/constants.js';

function signToken(merchantId) {
  return jwt.sign({ sub: merchantId.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const signup = asyncHandler(async (req, res) => {
  const { businessName, ownerName, phone, email, password, businessType, location } = req.body;

  const existing = await Merchant.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    throw ApiError.conflict('A merchant with this email or phone already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const merchant = await Merchant.create({
    businessName,
    ownerName,
    phone,
    email,
    passwordHash,
    businessType,
    location,
  });

  ok(res, { merchant: merchant.toSafeJSON(), token: signToken(merchant._id) }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const merchant = await Merchant.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  }).select('+passwordHash');

  if (!merchant || !(await bcrypt.compare(password, merchant.passwordHash))) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  ok(res, { merchant: merchant.toSafeJSON(), token: signToken(merchant._id) });
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { merchant: req.merchant.toSafeJSON() });
});
