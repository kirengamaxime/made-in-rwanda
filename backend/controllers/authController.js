const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const users = require('../models/users');
const { userJson, sellerJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
const respond = (res, row, status = 200, extra = {}) => {
  const user = userJson(row);
  res.status(status).json({ success: true, token: signToken(user), user, ...extra });
};

async function authenticate(email, password) {
  if (!v.isString(email) || !v.isString(password) || !email || !password) throw new AppError('Email and password are required.', 400);
  const row = await users.findByEmail(email);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw new AppError('Invalid email or password', 401);
  if (!row.is_active) throw new AppError('This account has been deactivated. Please contact support.', 403);
  return row;
}

const touchLogin = async (row) => {
  const { rows } = await query('update users set last_login_at = now() where id = $1 returning *', [row.id]);
  return rows[0];
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;
  const errors = {};
  if (!v.isNonEmpty(name, 2, 100)) errors.name = 'Full name must be at least 2 characters.';
  if (!v.isEmail(email)) errors.email = 'Enter a valid email address.';
  const normPhone = v.normalizePhone(phone);
  if (!normPhone) errors.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
  if (!v.isStrongPassword(password)) errors.password = 'Use at least 8 characters with an uppercase letter, a lowercase letter and a number.';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  v.throwIfErrors(errors);

  if (await users.findByEmail(email)) throw new AppError('Email already exists', 409, { email: 'Email already exists' });
  // Role is always forced to "buyer": public registration can never create sellers or admins.
  const row = await users.createUser({ name: name.trim(), email, phone: normPhone, password, role: 'buyer' });
  respond(res, row, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const row = await authenticate(req.body.email, req.body.password);
  if (row.role !== 'buyer') throw new AppError('This sign-in is for buyers. Sellers and staff must use their own sign-in page.', 403);
  respond(res, await touchLogin(row));
});

exports.sellerLogin = asyncHandler(async (req, res) => {
  const row = await authenticate(req.body.email, req.body.password);
  if (row.role !== 'seller') throw new AppError('This sign-in is for approved sellers only.', 403);
  const s = (await query('select * from sellers where user_id = $1', [row.id])).rows[0];
  if (!s) throw new AppError('No seller profile found for this account.', 403);
  if (s.status !== 'approved') throw new AppError('Your seller account is suspended. Please contact the marketplace team.', 403);
  respond(res, await touchLogin(row), 200, { seller: sellerJson(s) });
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const row = await authenticate(req.body.email, req.body.password);
  if (!['admin', 'manager'].includes(row.role)) throw new AppError('Unauthorized access.', 403);
  respond(res, await touchLogin(row));
});

exports.me = asyncHandler(async (req, res) => {
  let seller = null;
  if (req.user.role === 'seller') {
    const s = (await query('select * from sellers where user_id = $1', [req.user._id])).rows[0];
    seller = s ? sellerJson(s) : null;
  }
  res.json({ success: true, user: req.user, seller });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const errors = {};
  if (!v.isNonEmpty(name, 2, 100)) errors.name = 'Full name must be at least 2 characters.';
  const normPhone = v.normalizePhone(phone);
  if (!normPhone) errors.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
  v.throwIfErrors(errors);
  const { rows } = await query('update users set name = $1, phone = $2 where id = $3 returning *', [name.trim(), normPhone, req.user._id]);
  res.json({ success: true, user: userJson(rows[0]) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row = (await query('select * from users where id = $1', [req.user._id])).rows[0];
  if (!v.isString(currentPassword) || !(await bcrypt.compare(currentPassword, row.password_hash))) {
    throw new AppError('Current password is incorrect.', 400, { currentPassword: 'Current password is incorrect.' });
  }
  if (!v.isStrongPassword(newPassword)) {
    throw new AppError('Please correct the highlighted fields.', 400, { newPassword: 'Use at least 8 characters with an uppercase letter, a lowercase letter and a number.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  const { rows } = await query('update users set password_hash = $1, must_change_password = false where id = $2 returning *', [hash, req.user._id]);
  res.json({ success: true, message: 'Password updated.', user: userJson(rows[0]) });
});
