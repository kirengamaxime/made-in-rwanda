import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChevronDown, LogOut, User, Package, LayoutDashboard } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { initials } from '../utils/format.js';

const linkCls = ({ isActive }) => `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700'}`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const signOut = () => { logout(); navigate('/'); };
  const staff = user && user.role !== 'buyer';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Made in Rwanda home"><Logo /></Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLink to="/" end className={linkCls}>Home</NavLink>
          <Link to="/#categories" className="rounded-md px-3 py-2 text-sm font-semibold text-ink-700 hover:text-brand-700">Categories</Link>
          <NavLink to="/products" className={linkCls}>Products</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/become-seller" className="btn-sun btn-sm hidden sm:inline-flex">Become a Seller</Link>
          <Link to="/cart" className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100" aria-label={`Cart, ${count} items`}>
            <ShoppingCart size={22} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-ink-100" aria-haspopup="menu" aria-expanded={menu}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{initials(user.name)}</span>
                <span className="hidden max-w-[110px] truncate text-sm font-semibold md:block">{user.name.split(' ')[0]}</span>
                <ChevronDown size={16} className="hidden md:block" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-ink-100 bg-white p-1.5 shadow-lg" role="menu">
                  <div className="border-b border-ink-100 px-3 py-2"><p className="truncate text-sm font-bold">{user.name}</p><p className="truncate text-xs text-ink-500">{user.email}</p></div>
                  {staff ? (
                    <Link to={homeFor(user.role)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-50"><LayoutDashboard size={16} /> Dashboard</Link>
                  ) : (
                    <>
                      <Link to="/orders" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-50"><Package size={16} /> My orders</Link>
                      <Link to="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-50"><User size={16} /> My profile</Link>
                    </>
                  )}
                  <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50"><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn-primary btn-sm">Sign Up</Link>
            </div>
          )}

          <button className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink-100 bg-white lg:hidden" aria-label="Mobile">
          <div className="container-page flex flex-col gap-1 py-3">
            <NavLink to="/" end className={linkCls}>Home</NavLink>
            <Link to="/#categories" className="rounded-md px-3 py-2 text-sm font-semibold text-ink-700">Categories</Link>
            <NavLink to="/products" className={linkCls}>Products</NavLink>
            <Link to="/become-seller" className="btn-sun mt-1">Become a Seller</Link>
            {!user && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-outline">Sign In</Link>
                <Link to="/register" className="btn-primary">Sign Up</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
