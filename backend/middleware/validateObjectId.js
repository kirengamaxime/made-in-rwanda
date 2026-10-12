const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/validators');

// Rejects malformed ids before they reach the database.
module.exports = (...params) => (req, res, next) => {
  for (const p of params) {
    if (!isUuid(req.params[p])) return next(new AppError('Invalid identifier supplied.', 400));
  }
  return next();
};
