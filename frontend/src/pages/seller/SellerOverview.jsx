import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, ClipboardList, Clock, Package, KeyRound, AlertTriangle } from 'lucide-react';
import { getErrorMessage, sellersApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatRWF } from '../../utils/format.js';
import StatCard from '../../components/StatCard.jsx';

export default function SellerOverview() {
  const { user, seller } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { sellersApi.stats().then(({ data }) => setStats(data.stats)).catch((e) => setError(getErrorMessage(e))); }, []);
  const l = !stats && !error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Welcome, {seller?.businessName || user.name}</h1>
        <p className="text-sm text-ink-500">Here is how your shop is doing.</p>
      </div>
      {user.mustChangePassword && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sun-100 p-4 text-sm text-yellow-900">
          <KeyRound size={18} /><p className="flex-1">You are using a temporary password. Please change it to secure your account.</p>
          <Link to="/seller/profile" className="btn-sun btn-sm">Change password</Link>
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} label="Total products" value={stats?.totalProducts} loading={l} />
        <StatCard icon={ClipboardList} label="Total orders" value={stats?.totalOrders} tone="sky" loading={l} />
        <StatCard icon={Banknote} label="Total sales" value={stats && formatRWF(stats.totalSales)} tone="sun" loading={l} />
        <StatCard icon={Clock} label="Pending orders" value={stats?.pendingOrders} tone="ink" loading={l} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Best sellers</h2>
          {stats?.topProducts?.length ? (
            <ul className="mt-3 divide-y divide-ink-100">{stats.topProducts.map((p) => <li key={p.name} className="flex justify-between py-2 text-sm"><span className="truncate pr-3">{p.name}</span><span className="font-bold">{p.units} sold</span></li>)}</ul>
          ) : <p className="mt-3 text-sm text-ink-500">Sales will appear here once customers start ordering.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Quick actions</h2>
          {stats?.lowStock > 0 && <p className="mt-3 flex items-center gap-2 rounded-lg bg-sun-100 p-3 text-sm text-yellow-900"><AlertTriangle size={16} /> {stats.lowStock} product{stats.lowStock > 1 ? 's are' : ' is'} low on stock.</p>}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/seller/products/new" className="btn-primary">Add a product</Link>
            <Link to="/seller/orders" className="btn-outline">View orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
