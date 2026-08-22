import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Phase 4 will route this through the LangGraph copilot.
export const ask = asyncHandler(async (req, res) => {
  ok(res, {
    answer: 'The Sales & Growth Copilot arrives in Phase 4. Hang tight!',
    meta: { phase: 1 },
  });
});
