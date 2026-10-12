export const formatRWF = (n) => `${new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0))} RWF`;

export const formatDate = (d, withTime = false) => {
  if (!d) return '-';
  const opts = withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(d).toLocaleDateString('en-GB', opts);
};

export const PLACEHOLDER_IMG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#e9eeeb"/><path d="M120 250l60-70 50 55 30-35 40 50z" fill="#a4b0a9"/><circle cx="150" cy="160" r="22" fill="#a4b0a9"/></svg>')}`;

// Uploaded images are stored as "/uploads/..." (local) or full URLs (Cloudinary).
export const assetUrl = (u) => {
  if (!u) return PLACEHOLDER_IMG;
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  return `${import.meta.env.VITE_ASSET_BASE || ''}${u}`;
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U';
