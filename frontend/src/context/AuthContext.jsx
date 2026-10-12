import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const homeFor = (role) => ({ seller: '/seller', admin: '/admin', manager: '/admin' }[role] || '/');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const apply = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    setSeller(data.seller || null);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setSeller(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data.user);
    setSeller(data.seller || null);
    return data.user;
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    refresh().catch(() => tokenStore.clear()).finally(() => setLoading(false));
    return undefined;
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => { setUser(null); setSeller(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo(() => ({
    user, seller, loading, refresh, logout, setUser,
    register: async (d) => apply((await authApi.register(d)).data),
    login: async (d) => apply((await authApi.login(d)).data),
    sellerLogin: async (d) => apply((await authApi.sellerLogin(d)).data),
    adminLogin: async (d) => apply((await authApi.adminLogin(d)).data),
  }), [user, seller, loading, refresh, logout, apply]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
