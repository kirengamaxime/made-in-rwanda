import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, ExternalLink } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout({ title, nav }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate('/'); };

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-ink-200">
      <div className="px-5 py-5"><Logo light size={32} /></div>
      <p className="px-5 pb-2 text-xs font-semibold text-ink-300">{title}</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label={title}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-700 text-white' : 'hover:bg-white/10 hover:text-white'}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/10"><ExternalLink size={16} /> View marketplace</Link>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/10"><LogOut size={16} /> Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-ink-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <span className="hidden font-display text-sm font-bold lg:block">{title}</span>
          <span className="text-sm text-ink-500">Signed in as <strong className="text-ink-900">{user?.name}</strong> <span className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-xs font-semibold capitalize">{user?.role}</span></span>
        </header>
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
