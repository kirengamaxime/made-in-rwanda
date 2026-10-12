class AppError extends Error {
  constructor(message, statusCode = 400, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}
module.exports = AppError;
