import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { getErrorMessage, ordersApi } from '../services/api.js';
import { formatDate, formatRWF } from '../utils/format.js';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { ordersApi.mine().then(({ data }) => setOrders(data.orders)).catch((e) => { setError(getErrorMessage(e)); setOrders([]); }); }, []);

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-3">
        {orders === null ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          : orders.length === 0 ? <EmptyState icon={Package} title="No orders yet" message="When you place an order it will show up here." action={<Link to="/products" className="btn-primary">Start shopping</Link>} />
            : orders.map((o) => (
              <Link key={o._id} to={`/orders/${o._id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand-500">
                <div><p className="font-display font-bold">{o.orderNumber}</p><p className="text-sm text-ink-500">{formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p></div>
                <div className="flex items-center gap-4"><StatusBadge status={o.status} /><p className="font-extrabold">{formatRWF(o.totalAmount)}</p></div>
              </Link>
            ))}
      </div>
    </div>
  );
}
