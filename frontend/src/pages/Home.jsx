import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Smartphone, Truck } from 'lucide-react';
import { categoriesApi, productsApi } from '../services/api.js';
import CategoryCard from '../components/CategoryCard.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton, Skeleton } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Home() {
  const [categories, setCategories] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.categories)).catch(() => { setCategories([]); setError(true); });
    productsApi.list({ limit: 8, sort: 'newest' }).then(({ data }) => setProducts(data.products)).catch(() => { setProducts([]); setError(true); });
  }, []);

  return (
    <>
      <section className="grid lg:grid-cols-2">
        <div className="bg-brand-900 px-4 py-16 text-white sm:px-10 lg:py-24 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-16">
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">Discover Products Made in Rwanda</h1>
          <p className="mt-5 max-w-md text-lg text-brand-100">Shop quality products from talented Rwandan businesses and entrepreneurs.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-sun btn-lg">Shop Now</Link>
            <Link to="/become-seller" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">Become a Seller</Link>
          </div>
          <p className="mt-8 text-sm text-brand-200">Pay with MTN MoMo, Airtel Money, Visa or Mastercard.</p>
        </div>
        <div className="imigongo relative min-h-[240px] overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun-400 shadow-[0_0_0_14px_rgba(250,210,1,0.25),0_0_0_28px_rgba(250,210,1,0.12)] sm:h-64 sm:w-64" />
        </div>
      </section>
      <div className="imigongo-band" />

      <section className="border-b border-ink-100 bg-white">
        <div className="container-page grid gap-6 py-6 sm:grid-cols-3">
          {[[BadgeCheck, 'Reviewed local sellers', 'Every seller is checked by our team before selling.'], [Truck, 'Delivery across Rwanda', 'Orders delivered to all 30 districts.'], [Smartphone, 'Pay your way', 'Mobile money or card at checkout.']].map(([Icon, t, d]) => (
            <div key={t} className="flex items-start gap-3"><Icon className="mt-0.5 shrink-0 text-brand-700" size={22} /><div><p className="font-bold">{t}</p><p className="text-sm text-ink-500">{d}</p></div></div>
          ))}
        </div>
      </section>

      <section id="categories" className="container-page scroll-mt-20 pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Shop by category</h2>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-bold text-brand-700 sm:flex">All products <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categories === null
            ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
            : categories.map((c) => <CategoryCard key={c._id} category={c} />)}
        </div>
      </section>

      <section className="container-page pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Featured products</h2>
          <Link to="/products" className="flex items-center gap-1 text-sm font-bold text-brand-700">View all <ArrowRight size={16} /></Link>
        </div>
        {products === null ? <ProductGridSkeleton /> : products.length === 0 ? (
          <EmptyState title={error ? 'We could not load products' : 'No products yet'} message={error ? 'Check that the API is running, then refresh the page.' : 'Approved sellers will list their products here soon.'} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">{products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        )}
      </section>

      <section className="container-page pt-16">
        <div className="overflow-hidden rounded-2xl bg-ink-900 text-white">
          <div className="imigongo-band" />
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div>
              <h2 className="text-3xl font-extrabold">Make something in Rwanda? Sell it here.</h2>
              <p className="mt-3 text-ink-300">Apply once, tell us about your business and we will review it. Approved sellers receive sign-in details from our team and can list products straight away.</p>
              <Link to="/become-seller" className="btn-sun btn-lg mt-6">Become a Seller</Link>
            </div>
            <ol className="space-y-4 self-center">
              {[['Apply', 'Share your business details and photos.'], ['We review', 'Our team checks your application and contacts you.'], ['Start selling', 'Sign in to your seller dashboard and add products.']].map(([t, d], i) => (
                <li key={t} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-400 font-display font-extrabold text-ink-900">{i + 1}</span><div><p className="font-bold">{t}</p><p className="text-sm text-ink-300">{d}</p></div></li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
