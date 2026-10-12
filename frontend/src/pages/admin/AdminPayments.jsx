import { useEffect, useMemo, useState } from 'react';
import { getErrorMessage, paymentsApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { formatDate, formatRWF } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminPayments() {
  const [payments, setPayments] = useState(null);
  const [status, setStatus] = useState('');
  const { toast } = useUI();
  useEffect(() => { paymentsApi.list().then(({ data }) => setPayments(data.payments)).catch((e) => { toast.error(getErrorMessage(e)); setPayments([]); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (payments || []).filter((p) => !status || p.status === status), [payments, status]);

  const columns = [
    { header: 'Reference', render: (p) => <span className="font-mono text-xs font-semibold">{p.transactionReference}</span> },
    { header: 'Order', render: (p) => p.order?.orderNumber },
    { header: 'Buyer', render: (p) => p.buyer?.name },
    { header: 'Method', render: (p) => `${PAYMENT_METHODS[p.method]}${p.card?.last4 ? ` •••• ${p.card.last4}` : ''}` },
    { header: 'Amount', render: (p) => formatRWF(p.amount) },
    { header: 'Date', render: (p) => formatDate(p.createdAt, true) },
    { header: 'Status', render: (p) => <div><StatusBadge status={p.status} />{p.provider === 'simulated' && <p className="mt-0.5 text-[10px] text-ink-500">demo</p>}</div> },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Payments</h1>
      <select className="input sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{['pending', 'processing', 'successful', 'failed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
      <DataTable columns={columns} rows={rows} loading={payments === null} empty={{ title: 'No payments yet' }} />
    </div>
  );
}
