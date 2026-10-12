import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Minus, Plus, ShoppingCart, MapPin, Store } from 'lucide-react';
import { getErrorMessage, productsApi } from '../services/api.js';
import { assetUrl, formatRWF } from '../utils/format.js';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    setProduct(null); setError(''); setActive(0); setQty(1);
    productsApi.get(id).then(({ data }) => setProduct(data.product)).catch((e) => setError(getErrorMessage(e, 'Product not found')));
  }, [id]);

  if (error) return <div className="container-page py-16"><EmptyState title="Product not found" message={error} action={<Link to="/products" className="btn-primary">Browse products</Link>} /></div>;
  if (!product) {
    return (
      <div className="container-page grid gap-10 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
      </div>
    );
  }

  const soldOut = product.stock < 1;
  const add = () => { if (addToCart(product, qty)) { toast.success(`${product.name} added to cart`); return true; } return false; };
  const buyNow = () => { if (add()) navigate('/checkout'); };

  return (
    <div className="container-page py-8">
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-ink-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">Home</Link><ChevronRight size={14} />
        <Link to="/products" className="hover:text-brand-700">Products</Link><ChevronRight size={14} />
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-brand-700">{product.category?.name}</Link>
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-ink-100 bg-white">
            <img src={assetUrl(product.images[active])} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button key={img} onClick={() => setActive(i)} className={`aspect-square overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand-700' : 'border-transparent'}`} aria-label={`Show image ${i + 1}`}>
                  <img src={assetUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-brand-700">{product.category?.name}{product.subcategory ? ` / ${product.subcategory}` : ''}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">{product.name}</h1>
          <p className="mt-4 font-display text-3xl font-extrabold">{formatRWF(product.price)}</p>
          <p className={`mt-2 text-sm font-bold ${soldOut ? 'text-red-600' : product.stock <= 5 ? 'text-yellow-700' : 'text-brand-700'}`}>
            {soldOut ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left in stock` : `In stock (${product.stock} available)`}
          </p>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-700">{product.description}</p>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-ink-100">
            {product.seller?.logo ? <img src={assetUrl(product.seller.logo)} alt="" className="h-12 w-12 rounded-full object-cover" /> : <Store className="text-brand-700" />}
            <div className="min-w-0">
              <Link to={`/products?seller=${product.seller?._id}`} className="block truncate font-bold hover:text-brand-700">{product.seller?.businessName}</Link>
              {product.location && <p className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {product.location}</p>}
            </div>
          </div>

          {!soldOut && (
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-bold">Quantity</span>
              <div className="flex items-center rounded-lg border border-ink-200 bg-white">
                <button className="p-2.5 hover:bg-ink-50" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus size={16} /></button>
                <span className="w-10 text-center font-bold" aria-live="polite">{qty}</span>
                <button className="p-2.5 hover:bg-ink-50" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase quantity"><Plus size={16} /></button>
              </div>
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="btn-outline btn-lg" disabled={soldOut} onClick={add}><ShoppingCart size={18} /> Add to Cart</button>
            <button className="btn-primary btn-lg" disabled={soldOut} onClick={buyNow}>Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
