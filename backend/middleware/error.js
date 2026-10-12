const { isProd } = require('../config/env');

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const UNIQUE_MESSAGES = {
  users_email_key: 'Email already exists',
  seller_applications_active_email_key: 'Seller application already submitted',
  categories_name_key: 'Category already exists',
  categories_slug_key: 'Category already exists',
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  const errors = err.errors;

  if (!err.statusCode) {
    if (err.code === '23505') { status = 409; message = UNIQUE_MESSAGES[err.constraint] || 'That value already exists.'; }
    else if (err.code === '22P02') { status = 400; message = 'Invalid identifier supplied.'; }
    else if (err.code === '23503') { status = 409; message = 'This record is linked to other data and cannot be changed this way.'; }
    else if (err.code === '23514' || err.code === '23502') { status = 400; message = 'Invalid data supplied.'; }
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') { status = 401; message = 'Invalid or expired session. Please sign in again.'; }
    else if (err.name === 'MulterError') {
      status = 400;
      const map = { LIMIT_FILE_SIZE: 'Each image must be 5MB or smaller.', LIMIT_FILE_COUNT: 'Too many files uploaded.', LIMIT_UNEXPECTED_FILE: 'Too many images or an unexpected upload field.' };
      message = map[err.code] || 'File upload failed.';
    } else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON request body.'; }
    else if (/CORS/i.test(message)) status = 403;
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (isProd) message = 'Internal server error';
  }
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
};

module.exports = { notFound, errorHandler };
