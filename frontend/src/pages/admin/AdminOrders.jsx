import { useEffect, useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { getErrorMessage, ordersApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { ORDER_STATUSES } from '../../utils/constants.js';
import { formatDate, formatRWF } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import OrderSummary from '../../components/OrderSummary.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const optionsFor = (status) => (status === 'Pending' ? ['Cancelled'] : status === 'Cancelled' ? [] : ['Processing', 'Shipped', 'Delivered', 'Cancelled'].filter((s) => s !== status));

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState(null);
  const { toast, confirm } = useUI();

  const load = () => ordersApi.list().then(({ data }) => setOrders(data.orders)).catch((e) => { toast.error(getErrorMessage(e)); setOrders([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => (orders || []).filter((o) => (!status || o.status === status) && (!q || `${o.orderNumber} ${o.buyer?.name}`.toLowerCase().includes(q.toLowerCase()))), [orders, q, status]);

  const update = async (o, next) => {
    if (!(await confirm({ title: `Change status to ${next}?`, message: next === 'Cancelled' ? 'Cancelling a paid order returns its items to stock. Refunds must be handled through your payment provider.' : `Order ${o.orderNumber} will be marked ${next}.`, confirmText: `Mark ${next}`, danger: next === 'Cancelled' }))) return;
    try { await ordersApi.updateStatus(o._id, next); toast.success('Order updated.'); load(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Order', render: (o) => <span className="font-semibold">{o.orderNumber}</span> },
    { header: 'Buyer', render: (o) => <div><p className="font-semibold">{o.buyer?.name}</p><p className="text-xs text-ink-500">{o.buyer?.email}</p></div> },
    { header: 'Date', render: (o) => formatDate(o.createdAt) },
    { header: 'Total', render: (o) => formatRWF(o.totalAmount) },
    { header: 'Payment', render: (o) => (o.payment ? <StatusBadge status={o.payment.status} /> : <span className="text-xs text-ink-500">none</span>) },
    { header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { header: 'Actions', render: (o) => (
      <div className="flex items-center gap-1.5">
        <button className="btn-outline btn-sm" onClick={() => setView(o)} aria-label="View order"><Eye size={14} /></button>
        {optionsFor(o.status).length > 0 && (
          <select className="input !w-auto !py-1.5 text-xs" value="" onChange={(e) => e.target.value && update(o, e.target.value)} aria-label="Change order status">
            <option value="">Change status…</option>{optionsFor(o.status).map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>) },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search by order number or buyer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <DataTable columns={columns} rows={rows} loading={orders === null} empty={{ title: 'No orders found' }} />
      <Modal open={!!view} onClose={() => setView(null)} title="Order details" wide>{view && <OrderSummary order={view} showFulfillment />}</Modal>
    </div>
  );
}
