const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { userJson, sellerJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isUuid } = require('../utils/validators');
const { jwtSecret } = require('../config/env');

const extractToken = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

const loadActiveUser = async (id) => {
  if (!isUuid(id)) return null;
  const { rows } = await query('select * from users where id = $1', [id]);
  return rows[0] && rows[0].is_active ? userJson(rows[0]) : null;
};

// Requires a valid JWT. The user is re-loaded from the DB on every request,
// so deactivated accounts and role changes take effect immediately.
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Authentication required. Please sign in.', 401);
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (e) {
    throw new AppError('Your session has expired. Please sign in again.', 401);
  }
  const user = await loadActiveUser(decoded.id);
  if (!user) throw new AppError('Account not found or deactivated.', 401);
  req.user = user;
  next();
});

// Attaches req.user if a valid token is present, otherwise continues anonymously.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const user = await loadActiveUser(jwt.verify(token, jwtSecret).id);
      if (user) req.user = user;
    } catch (e) { /* treated as anonymous */ }
  }
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Unauthorized access: you do not have permission to do this.', 403));
  }
  return next();
};

// Seller routes: user must be role=seller AND have an approved seller profile.
const requireApprovedSeller = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'seller') throw new AppError('Unauthorized access: sellers only.', 403);
  const { rows } = await query('select * from sellers where user_id = $1', [req.user._id]);
  if (!rows[0]) throw new AppError('No seller profile found for this account.', 403);
  if (rows[0].status !== 'approved') throw new AppError('Your seller account is suspended. Please contact the marketplace team.', 403);
  req.seller = sellerJson(rows[0]);
  next();
});

module.exports = { protect, optionalAuth, authorize, requireApprovedSeller };
