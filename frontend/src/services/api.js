import axios from 'axios';

/**
 * Base URL for the API.
 *
 * Local dev:   set VITE_API_URL=http://localhost:5000/api  in frontend/.env
 * Production:  set VITE_API_URL=https://made-in-rwanda.onrender.com/api
 *              in Vercel → Project → Settings → Environment Variables.
 *
 * Must include the "/api" suffix — every call below is relative (e.g. "/auth/login").
 */
const rawBase = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBase.replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  // 45s covers Render free-tier cold starts (~30s after 15 min idle).
  timeout: 45000,
});

const TOKEN_KEY = 'mir_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isAuthCall =
      (err.config?.url || '').startsWith('/auth/') &&
      err.config.url !== '/auth/me';
    if (err.response?.status === 401 && tokenStore.get() && !isAuthCall) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (
  err,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK')
    return 'Cannot reach the server. If the backend was idle, it may take up to 30 seconds to wake up — please try again.';
  if (err?.code === 'ECONNABORTED')
    return 'The request timed out. The server may be waking up — please try again in a moment.';
  return fallback;
};

export const getFieldErrors = (err) => err?.response?.data?.errors || {};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  sellerLogin: (d) => api.post('/auth/seller/login', d),
  adminLogin: (d) => api.post('/auth/admin/login', d),
  me: () => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/me', d),
  changePassword: (d) => api.put('/auth/password', d),
};

export const productsApi = {
  list: (params) => api.get('/products', { params }),
  mine: () => api.get('/products/mine'),
  get: (id) => api.get(`/products/${id}`),
  create: (formData) => api.post('/products', formData, multipart),
  update: (id, formData) => api.put(`/products/${id}`, formData, multipart),
  remove: (id) => api.delete(`/products/${id}`),
};

export const categoriesApi = {
  list: (all = false) =>
    api.get('/categories', { params: all ? { all: true } : {} }),
  create: (d) => api.post('/categories', d),
  update: (id, d) => api.put(`/categories/${id}`, d),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const sellersApi = {
  list: () => api.get('/sellers'),
  me: () => api.get('/sellers/me'),
  updateMe: (d) => api.put('/sellers/me', d),
  stats: () => api.get('/sellers/me/stats'),
};

export const settingsApi = {
  public: () => api.get('/settings/public'),
};

export const applicationsApi = {
  submit: (formData) => api.post('/seller-applications', formData, multipart),
  status: (email) =>
    api.get('/seller-applications/status', { params: { email } }),
  list: (params) => api.get('/seller-applications', { params }),
  get: (id) => api.get(`/seller-applications/${id}`),
  approve: (id, d) => api.put(`/seller-applications/${id}/approve`, d),
  reject: (id, d) => api.put(`/seller-applications/${id}/reject`, d),
};

export const ordersApi = {
  create: (d) => api.post('/orders', d),
  mine: () => api.get('/orders/my-orders'),
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

export const paymentsApi = {
  create: (d) => api.post('/payments', d),
  get: (id) => api.get(`/payments/${id}`),
  cancel: (id) => api.post(`/payments/${id}/cancel`),
  list: (params) => api.get('/payments', { params }),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/admin/users', { params }),
  setUserStatus: (id, isActive) =>
    api.put(`/admin/users/${id}/status`, { isActive }),
  sellers: () => api.get('/admin/sellers'),
  setSellerStatus: (id, status) =>
    api.put(`/admin/sellers/${id}/status`, { status }),
  resetCredentials: (id) =>
    api.post(`/admin/sellers/${id}/reset-credentials`),
  products: (params) => api.get('/admin/products', { params }),
  setProductStatus: (id, status) =>
    api.put(`/admin/products/${id}/status`, { status }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (d) => api.put('/admin/settings', d),
};

export default api;