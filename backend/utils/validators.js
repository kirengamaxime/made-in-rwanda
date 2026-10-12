const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Rwanda mobile numbers: 072/073 (Airtel), 078/079 (MTN); accepts 07XXXXXXXX, 2507XXXXXXXX, +2507XXXXXXXX
const RW_PHONE_RE = /^(?:\+?250|0)(7[2389]\d{7})$/;

const isString = (v) => typeof v === 'string';
const isNonEmpty = (v, min = 1, max = 500) => isString(v) && v.trim().length >= min && v.trim().length <= max;
const isEmail = (v) => isString(v) && v.length <= 254 && EMAIL_RE.test(v.trim());
const normalizePhone = (v) => {
  if (!isString(v)) return null;
  const m = v.replace(/[\s-]/g, '').match(RW_PHONE_RE);
  return m ? `0${m[1]}` : null;
};
const isMtnPhone = (p) => /^07[89]\d{7}$/.test(p || '');
const isAirtelPhone = (p) => /^07[23]\d{7}$/.test(p || '');
const isStrongPassword = (v) => isString(v) && v.length >= 8 && v.length <= 128 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
const isUuid = (v) => isString(v) && UUID_RE.test(v);
const isPositiveInt = (v, min = 1, max = 1e9) => v !== '' && v !== null && v !== undefined && Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max;
// escape LIKE wildcards so user input is matched literally
const escapeLike = (s) => String(s).replace(/[\\%_]/g, '\\$&');

const luhnValid = (num) => {
  if (!/^\d{13,19}$/.test(num)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};
const cardBrand = (num) => {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(num)) return 'visa';
  if (/^(5[1-5]\d{14}|2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12})$/.test(num)) return 'mastercard';
  return null;
};
const expiryValid = (exp) => {
  const m = isString(exp) && exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  return new Date(year, month, 0, 23, 59, 59) >= new Date();
};

const throwIfErrors = (errors, message = 'Please correct the highlighted fields.') => {
  if (Object.keys(errors).length) throw new AppError(message, 400, errors);
};

module.exports = {
  isString, isNonEmpty, isEmail, normalizePhone, isMtnPhone, isAirtelPhone, isStrongPassword,
  isUuid, isObjectId: isUuid, isPositiveInt, escapeLike, luhnValid, cardBrand, expiryValid, throwIfErrors,
};
