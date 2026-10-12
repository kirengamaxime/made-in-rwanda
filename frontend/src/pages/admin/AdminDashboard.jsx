import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Banknote, ClipboardList, CreditCard, FileText, LayoutDashboard, Package, Settings, Store, Tags, Users, UserCheck, Clock } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { adminApi, getErrorMessage } from '../../services/api.js';
import { formatDate, formatRWF } from '../../utils/format.js';
import AdminApplications from './AdminApplications.jsx';
import AdminSellers from './AdminSellers.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminCategories from './AdminCategories.jsx';
import AdminPayments from './AdminPayments.jsx';
import AdminSettings from './AdminSettings.jsx';
import NotFound from '../NotFound.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/applications', label: 'Seller applications', icon: FileText },
  { to: '/admin/sellers', label: 'Sellers', icon: Store },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/users', label: 'Buyers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { adminApi.stats().then(({ data }) => setStats(data.stats)).catch((e) => setError(getErrorMessage(e))); }, []);
  const l = !stats && !error;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Marketplace overview</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={stats?.totalUsers} loading={l} />
        <StatCard icon={UserCheck} label="Total sellers" value={stats?.totalSellers} tone="sky" loading={l} />
        <StatCard icon={Clock} label="Pending applications" value={stats?.pendingApplications} tone="sun" loading={l} />
        <StatCard icon={Package} label="Total products" value={stats?.totalProducts} tone="ink" loading={l} />
        <StatCard icon={ClipboardList} label="Total orders" value={stats?.totalOrders} tone="sky" loading={l} />
        <StatCard icon={Banknote} label="Total sales" value={stats && formatRWF(stats.totalSales)} loading={l} />
      </div>
      {stats?.pendingApplications > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sun-100 p-4 text-sm text-yellow-900">
          <p><strong>{stats.pendingApplications}</strong> seller application{stats.pendingApplications > 1 ? 's are' : ' is'} waiting for review.</p>
          <Link to="/admin/applications" className="btn-sun btn-sm">Review applications</Link>
        </div>
      )}
      <div className="card p-5">
        <h2 className="font-bold">Recent orders</h2>
        {stats?.recentOrders?.length ? (
          <ul className="mt-3 divide-y divide-ink-100">
            {stats.recentOrders.map((o) => (
              <li key={o._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><strong>{o.orderNumber}</strong> <span className="text-ink-500">· {o.buyer?.name} · {formatDate(o.createdAt)}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} /><strong>{formatRWF(o.totalAmount)}</strong></span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-ink-500">{l ? 'Loading…' : 'No orders yet.'}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<DashboardLayout title="Admin dashboard" nav={NAV} />}>
        <Route index element={<Overview />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="sellers" element={<AdminSellers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
