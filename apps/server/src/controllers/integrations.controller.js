import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
  runImport,
  generateSampleCsv,
  getImportedData,
} from '../services/integrations.service.js';

export const list = asyncHandler(async (req, res) => {
  ok(res, { integrations: await listIntegrations(req.merchant._id) });
});

export const connect = asyncHandler(async (req, res) => {
  ok(res, { integrations: await connectIntegration(req.merchant._id, req.params.provider) });
});

export const disconnect = asyncHandler(async (req, res) => {
  ok(res, { integrations: await disconnectIntegration(req.merchant._id, req.params.provider) });
});

/**
 * Import data: either an uploaded CSV file ("file" field) or the provider's
 * generated sample (body.sample = 'true'). body.dataType: transactions|products.
 */
export const importData = asyncHandler(async (req, res) => {
  const providerId = req.params.provider;
  const dataType = req.body.dataType === 'products' ? 'products' : 'transactions';
  let csvText;
  let usedSample = false;
  if (req.file) {
    csvText = req.file.buffer.toString('utf8');
  } else if (req.body.sample === 'true' || req.body.sample === true) {
    csvText = generateSampleCsv(providerId, dataType);
    usedSample = true;
  } else {
    throw ApiError.badRequest('Upload a CSV file or set sample=true');
  }
  const result = await runImport(req.merchant._id, providerId, { csvText, dataType });
  ok(res, { ...result, usedSample });
});

export const viewData = asyncHandler(async (req, res) => {
  ok(res, await getImportedData(req.merchant._id, req.params.provider));
});
