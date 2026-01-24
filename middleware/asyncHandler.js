/**
 * Async/Await Wrapper
 * Phase 1: Eliminates callback hell and enables try/catch error handling
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
