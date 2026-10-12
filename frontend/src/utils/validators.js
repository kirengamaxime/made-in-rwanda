export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());

// Accepts 07XXXXXXXX, 2507XXXXXXXX, +2507XXXXXXXX (072/073 Airtel, 078/079 MTN)
export const normalizePhone = (v) => {
  const m = String(v || '').replace(/[\s-]/g, '').match(/^(?:\+?250|0)(7[2389]\d{7})$/);
  return m ? `0${m[1]}` : null;
};
export const isMtn = (p) => /^07[89]\d{7}$/.test(p || '');
export const isAirtel = (p) => /^07[23]\d{7}$/.test(p || '');

export const passwordRules = (v = '') => [
  { ok: v.length >= 8, label: 'At least 8 characters' },
  { ok: /[A-Z]/.test(v), label: 'One uppercase letter' },
  { ok: /[a-z]/.test(v), label: 'One lowercase letter' },
  { ok: /\d/.test(v), label: 'One number' },
];
export const isStrongPassword = (v) => passwordRules(v).every((r) => r.ok);

export const luhn = (num) => {
  if (!/^\d{13,19}$/.test(num)) return false;
  let sum = 0; let dbl = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
};
export const cardBrand = (num) => {
  if (/^4/.test(num)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
  return null;
};
export const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
export const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
export const expiryValid = (v) => {
  const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  return new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59, 59) >= new Date();
};
