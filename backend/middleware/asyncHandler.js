// Express 4 does not forward rejected promises automatically.
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
module.exports = asyncHandler;
