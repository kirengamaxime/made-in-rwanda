import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { assetUrl, formatRWF } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { toast, confirm } = useUI();
  const load = () => adminApi.products().then(({ data }) => setProducts(data.products)).catch((e) => { toast.error(getErrorMessage(e)); setProducts([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => (products || []).filter((p) => (!status || p.status === status) && (!q || `${p.name} ${p.seller?.businessName}`.toLowerCase().includes(q.toLowerCase()))), [products, q, status]);

  const setProductStatus = async (p, next) => {
    if (next === 'removed' && !(await confirm({ title: `Remove "${p.name}"?`, message: 'The product is hidden from the marketplace. You can restore it later.', confirmText: 'Remove product', danger: true }))) return;
    try { await adminApi.setProductStatus(p._id, next); toast.success(next === 'removed' ? 'Product removed.' : 'Product restored.'); load(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Product', render: (p) => <div className="flex items-center gap-3"><img src={assetUrl(p.images[0])} alt="" className="h-10 w-10 rounded-md object-cover" /><span className="max-w-[220px] truncate font-semibold">{p.name}</span></div> },
    { header: 'Seller', render: (p) => p.seller?.businessName },
    { header: 'Category', render: (p) => p.category?.name },
    { header: 'Price', render: (p) => formatRWF(p.price) },
    { header: 'Stock', key: 'stock' },
    { header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { header: 'Actions', render: (p) => p.status === 'removed'
      ? <button className="btn-outline btn-sm" onClick={() => setProductStatus(p, 'active')}>Restore</button>
      : <button className="btn-outline btn-sm text-red-600" onClick={() => setProductStatus(p, 'removed')}>Remove</button> },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Products</h1>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search by product or seller" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" /></div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="removed">Removed</option></select>
      </div>
      <DataTable columns={columns} rows={rows} loading={products === null} empty={{ title: 'No products found' }} />
    </div>
  );
}
