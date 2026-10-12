import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, PackageSearch } from 'lucide-react';
import { categoriesApi, getErrorMessage, productsApi, sellersApi } from '../services/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Pagination from '../components/Pagination.jsx';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');
  const [price, setPrice] = useState({ min: params.get('minPrice') || '', max: params.get('maxPrice') || '' });

  const get = (k, d = '') => params.get(k) || d;
  const update = useCallback((patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v === null || v === undefined || v === false) next.delete(k); else next.set(k, v); });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  }, [params, setParams]);

  useEffect(() => {
    categoriesApi.list().then(({ data: d }) => setCategories(d.categories)).catch(() => {});
    sellersApi.list().then(({ data: d }) => setSellers(d.sellers)).catch(() => {});
  }, []);

  const query = params.toString();
  useEffect(() => {
    setData(null); setError('');
    productsApi.list(Object.fromEntries(new URLSearchParams(query))).then(({ data: d }) => setData(d)).catch((e) => { setError(getErrorMessage(e)); setData({ products: [], total: 0, page: 1, pages: 1 }); });
  }, [query]);

  useEffect(() => { setQ(params.get('q') || ''); }, [params]);

  const clearAll = () => { setPrice({ min: '', max: '' }); setQ(''); setParams({}); };
  const hasFilters = ['q', 'category', 'minPrice', 'maxPrice', 'seller', 'inStock'].some((k) => params.get(k));

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="label">Category</p>
        <select className="input" value={get('category')} onChange={(e) => update({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <p className="label">Price range (RWF)</p>
        <div className="flex items-center gap-2">
          <input type="number" min="0" inputMode="numeric" placeholder="Min" className="input" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} />
          <span className="text-ink-300">–</span>
          <input type="number" min="0" inputMode="numeric" placeholder="Max" className="input" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} />
        </div>
        <button className="btn-outline btn-sm mt-2 w-full" onClick={() => update({ minPrice: price.min, maxPrice: price.max })}>Apply price</button>
      </div>
      <div>
        <p className="label">Seller</p>
        <select className="input" value={get('seller')} onChange={(e) => update({ seller: e.target.value })}>
          <option value="">All sellers</option>
          {sellers.map((s) => <option key={s._id} value={s._id}>{s.businessName}</option>)}
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={get('inStock') === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} /> In stock only
      </label>
      {hasFilters && <button className="btn-ghost btn-sm w-full" onClick={clearAll}><X size={14} /> Clear all filters</button>}
    </div>
  );

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">Products</h1>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); update({ q: q.trim() }); }} role="search">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input pl-10" placeholder="Search by product, seller or category" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        </form>
        <select className="input sm:w-56" value={get('sort', 'newest')} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <button className="btn-outline lg:hidden" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters</button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block"><div className="card sticky top-24 p-5">{filters}</div></aside>
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/50" onClick={() => setFiltersOpen(false)} />
            <div className="absolute inset-y-0 right-0 w-80 max-w-full overflow-y-auto bg-white p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Filters</h2><button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X /></button></div>
              {filters}
              <button className="btn-primary mt-6 w-full" onClick={() => setFiltersOpen(false)}>Show results</button>
            </div>
          </div>
        )}
        <div>
          {data && <p className="mb-4 text-sm text-ink-500">{data.total} {data.total === 1 ? 'product' : 'products'} found</p>}
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {data === null ? <ProductGridSkeleton count={8} /> : data.products.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No products match your search" message="Try different keywords or remove some filters." action={hasFilters && <button className="btn-primary" onClick={clearAll}>Clear filters</button>} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{data.products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
              <Pagination page={data.page} pages={data.pages} onChange={(p) => { update({ page: p }); window.scrollTo({ top: 0 }); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
