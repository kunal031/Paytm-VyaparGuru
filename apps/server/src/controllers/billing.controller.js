import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createBill,
  listBills,
  getBill,
  returnBill,
  getDaySummary,
  listCustomers,
  createCustomer,
  recordKhataPayment,
  getCustomerKhata,
} from '../services/billing.service.js';

export const create = asyncHandler(async (req, res) => {
  ok(res, { bill: await createBill(req.merchant._id, req.body, req.authUser.ownerName) }, 201);
});

export const list = asyncHandler(async (req, res) => {
  ok(res, { bills: await listBills(req.merchant._id, { date: req.query.date, limit: Number(req.query.limit) || 50 }) });
});

export const detail = asyncHandler(async (req, res) => {
  const bill = await getBill(req.merchant._id, req.params.id);
  ok(res, { bill });
});

export const doReturn = asyncHandler(async (req, res) => {
  ok(res, { bill: await returnBill(req.merchant._id, req.params.id, req.body) });
});

export const daySummary = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  ok(res, await getDaySummary(req.merchant._id, date));
});

export const customers = asyncHandler(async (req, res) => {
  ok(res, { customers: await listCustomers(req.merchant._id) });
});

export const addCustomer = asyncHandler(async (req, res) => {
  ok(res, { customer: await createCustomer(req.merchant._id, req.body) }, 201);
});

export const khataPayment = asyncHandler(async (req, res) => {
  ok(res, { customer: await recordKhataPayment(req.merchant._id, req.params.id, req.body) });
});

export const customerKhata = asyncHandler(async (req, res) => {
  ok(res, await getCustomerKhata(req.merchant._id, req.params.id));
});
