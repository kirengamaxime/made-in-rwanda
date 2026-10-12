import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl, formatRWF } from '../utils/format.js';
import EmptyState from '../components/EmptyState.jsx';

export default function Cart() {
  const { items, setQuantity, removeItem, subtotal, count } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return <div className="container-page py-16"><EmptyState icon={ShoppingBag} title="Your cart is empty" message="Browse Rwandan-made products and add your favourites." action={<Link to="/products" className="btn-primary">Start shopping</Link>} /></div>;
  }
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">Shopping cart <span className="text-lg font-semibold text-ink-500">({count} {count === 1 ? 'item' : 'items'})</span></h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.productId} className="card flex gap-4 p-4">
              <Link to={`/products/${it.productId}`}><img src={assetUrl(it.image)} alt={it.name} className="h-24 w-24 rounded-lg object-cover" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0"><Link to={`/products/${it.productId}`} className="line-clamp-2 font-bold hover:text-brand-700">{it.name}</Link><p className="text-sm text-ink-500">by {it.sellerName}</p></div>
                  <button className="self-start rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600" onClick={() => removeItem(it.productId)} aria-label={`Remove ${it.name}`}><Trash2 size={18} /></button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="flex items-center rounded-lg border border-ink-200">
                    <button className="p-2 hover:bg-ink-50" onClick={() => setQuantity(it.productId, it.quantity - 1)} disabled={it.quantity <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
                    <span className="w-9 text-center text-sm font-bold">{it.quantity}</span>
                    <button className="p-2 hover:bg-ink-50" onClick={() => setQuantity(it.productId, it.quantity + 1)} disabled={it.quantity >= it.stock} aria-label="Increase quantity"><Plus size={14} /></button>
                  </div>
                  <div className="text-right"><p className="font-extrabold">{formatRWF(it.price * it.quantity)}</p>{it.quantity >= it.stock && <p className="text-xs text-yellow-700">Maximum available</p>}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd className="font-semibold">{formatRWF(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Delivery</dt><dd className="text-ink-500">Calculated at checkout</dd></div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{formatRWF(subtotal)}</dd></div>
          </dl>
          <button className="btn-primary btn-lg mt-5 w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
          <Link to="/products" className="btn-ghost mt-2 w-full">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
