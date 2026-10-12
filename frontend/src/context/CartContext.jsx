import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useUI } from './UIContext.jsx';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
const KEY = 'mir_cart';

const load = () => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const { user } = useAuth();
  const { toast } = useUI();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage unavailable */ }
  }, [items]);

  // Returns true if added. Enforces stock limits and buyer-only shopping.
  const addToCart = useCallback((product, quantity = 1) => {
    if (user && user.role !== 'buyer') { toast.error('Please sign in with a buyer account to shop.'); return false; }
    if (product.stock < 1) { toast.error('This product is out of stock.'); return false; }
    let added = false;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      const current = existing ? existing.quantity : 0;
      const next = Math.min(product.stock, current + quantity);
      if (next === current) { toast.error(`Only ${product.stock} available in stock.`); return prev; }
      added = true;
      if (next < current + quantity) toast.info(`Quantity limited to available stock (${product.stock}).`);
      const line = { productId: product._id, name: product.name, price: product.price, image: product.images?.[0], stock: product.stock, sellerName: product.seller?.businessName, quantity: next };
      return existing ? prev.map((i) => (i.productId === product._id ? { ...i, ...line } : i)) : [...prev, line];
    });
    return added;
  }, [user, toast]);

  const setQuantity = useCallback((productId, quantity) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(i.stock, quantity)) } : i)));
  }, []);
  const removeItem = useCallback((productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items, addToCart, setQuantity, removeItem, clear,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [items, addToCart, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
