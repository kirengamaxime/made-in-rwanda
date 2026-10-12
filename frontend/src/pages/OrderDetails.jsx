import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getErrorMessage, ordersApi } from '../services/api.js';
import { useUI } from '../context/UIContext.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PageSpinner } from '../components/Skeleton.jsx';

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { toast, confirm } = useUI();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { ordersApi.get(id).then(({ data }) => setOrder(data.order)).catch((e) => setError(getErrorMessage(e, 'Order not found'))); }, [id]);

  const cancel = async () => {
    if (!(await confirm({ title: 'Cancel this order?', message: 'This order has not been paid. It will be cancelled.', confirmText: 'Cancel order', danger: true }))) return;
    try { const { data } = await ordersApi.updateStatus(id, 'Cancelled'); setOrder(data.order); toast.success('Order cancelled.'); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  if (error) return <div className="container-page py-16"><EmptyState title="Order not found" message={error} action={<Link to="/orders" className="btn-primary">My orders</Link>} /></div>;
  if (!order) return <PageSpinner />;
  return (
    <div className="container-page max-w-3xl py-8">
      {location.state?.justPaid && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-brand-800">
          <CheckCircle2 className="mt-0.5 shrink-0" />
          <div><p className="font-bold">Thank you! Your order is confirmed.</p><p className="text-sm">The sellers have been notified and will prepare your items for delivery.</p></div>
        </div>
      )}
      <div className="card p-5 sm:p-6"><OrderSummary order={order} showFulfillment={order.status !== 'Pending'} /></div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/orders" className="btn-outline">All orders</Link>
        <Link to="/products" className="btn-primary">Continue shopping</Link>
        {order.status === 'Pending' && <button className="btn-danger" onClick={cancel}>Cancel order</button>}
      </div>
    </div>
  );
}
