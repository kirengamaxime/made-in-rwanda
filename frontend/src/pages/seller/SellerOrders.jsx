import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { getErrorMessage, ordersApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { formatDate, formatRWF } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import OrderSummary from '../../components/OrderSummary.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
// the seller's overall progress on an order = the least advanced of their items
const myStatus = (o) => {
  const active = o.items.filter((i) => i.fulfillmentStatus !== 'Cancelled');
  if (!active.length) return 'Cancelled';
  return FLOW[Math.min(...active.map((i) => FLOW.indexOf(i.fulfillmentStatus)))];
};

export default function SellerOrders() {
  const [orders, setOrders] = useState(null);
  const [view, setView] = useState(null);
  const { toast, confirm } = useUI();

  useEffect(() => { ordersApi.list().then(({ data }) => setOrders(data.orders)).catch((e) => { toast.error(getErrorMessage(e)); setOrders([]); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (o, status) => {
    if (!(await confirm({ title: `Mark as ${status}?`, message: `Order ${o.orderNumber} will be updated for your items. The buyer will see the new status.`, confirmText: `Mark ${status}` }))) return;
    try {
      const { data } = await ordersApi.updateStatus(o._id, status);
      setOrders((list) => list.map((x) => (x._id === o._id ? data.order : x)));
      toast.success(`Order marked ${status}.`);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Order', render: (o) => <span className="font-semibold">{o.orderNumber}</span> },
    { header: 'Date', render: (o) => formatDate(o.createdAt) },
    { header: 'Customer', render: (o) => o.deliveryInformation.fullName },
    { header: 'Items', render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
    { header: 'Your total', render: (o) => formatRWF(o.sellerTotal) },
    { header: 'Status', render: (o) => <StatusBadge status={myStatus(o)} /> },
    { header: 'Actions', render: (o) => {
      const cur = myStatus(o);
      const idx = FLOW.indexOf(cur);
      return (
        <div className="flex items-center gap-1.5">
          <button className="btn-outline btn-sm" onClick={() => setView(o)} aria-label="View order"><Eye size={14} /></button>
          {cur !== 'Cancelled' && cur !== 'Delivered' && (
            <select className="input !w-auto !py-1.5 text-xs" value="" onChange={(e) => e.target.value && update(o, e.target.value)} aria-label="Update fulfillment status">
              <option value="">Update status…</option>
              {FLOW.slice(Math.max(1, idx + 1)).map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold">Orders</h1><p className="text-sm text-ink-500">Paid orders that contain your products. You only see your own items.</p></div>
      <DataTable columns={columns} rows={orders || []} loading={orders === null} empty={{ title: 'No orders yet', message: 'Paid orders for your products will appear here.' }} />
      <Modal open={!!view} onClose={() => setView(null)} title="Order details" wide>{view && <OrderSummary order={view} showFulfillment />}</Modal>
    </div>
  );
}
