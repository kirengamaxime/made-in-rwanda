import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { categoriesApi, getErrorMessage, productsApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { assetUrl, formatRWF } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function SellerProducts() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', status: '' });
  const { toast, confirm } = useUI();

  const load = () => productsApi.mine().then(({ data }) => setProducts(data.products)).catch((e) => { toast.error(getErrorMessage(e)); setProducts([]); });
  useEffect(() => { load(); categoriesApi.list().then(({ data }) => setCategories(data.categories)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => (products || []).filter((p) => (
    (!filters.q || p.name.toLowerCase().includes(filters.q.toLowerCase())) && (!filters.category || p.category?._id === filters.category) && (!filters.status || p.status === filters.status)
  )), [products, filters]);

  const remove = async (p) => {
    if (!(await confirm({ title: `Delete "${p.name}"?`, message: 'This permanently deletes the product and its images.', confirmText: 'Delete product', danger: true }))) return;
    try { await productsApi.remove(p._id); toast.success('Product deleted.'); setProducts((list) => list.filter((x) => x._id !== p._id)); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Product', render: (p) => (<div className="flex items-center gap-3"><img src={assetUrl(p.images[0])} alt="" className="h-11 w-11 rounded-md object-cover" /><span className="max-w-[220px] truncate font-semibold">{p.name}</span></div>) },
    { header: 'Category', render: (p) => p.category?.name },
    { header: 'Price', render: (p) => formatRWF(p.price) },
    { header: 'Stock', render: (p) => <span className={p.stock <= 5 ? 'font-bold text-red-600' : ''}>{p.stock}{p.stock === 0 ? ' (sold out)' : ''}</span> },
    { header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { header: 'Actions', render: (p) => (
      <div className="flex gap-1.5">
        <Link to={`/seller/products/${p._id}/edit`} className="btn-outline btn-sm" aria-label={`Edit ${p.name}`}><Pencil size={14} /> Edit</Link>
        <button className="btn-outline btn-sm text-red-600" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Trash2 size={14} /></button>
      </div>) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">My products</h1>
        <Link to="/seller/products/new" className="btn-primary"><Plus size={16} /> Add product</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search products" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} aria-label="Search products" /></div>
        <select className="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Filter by category"><option value="">All categories</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
      <DataTable columns={columns} rows={rows} loading={products === null} empty={{ title: 'No products found', message: 'Add your first product to start selling.' }} />
    </div>
  );
}
