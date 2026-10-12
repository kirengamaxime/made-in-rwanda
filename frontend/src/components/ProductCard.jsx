import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { assetUrl, formatRWF } from '../utils/format.js';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { toast } = useUI();
  const soldOut = product.stock < 1;

  const add = (e) => {
    e.preventDefault();
    if (addToCart(product, 1)) toast.success(`${product.name} added to cart`);
  };

  return (
    <Link to={`/products/${product._id}`} className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-ink-100">
        <img src={assetUrl(product.images?.[0])} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {soldOut && <span className="absolute left-3 top-3 rounded-md bg-ink-900 px-2 py-1 text-xs font-bold text-white">Sold out</span>}
        {!soldOut && product.stock <= 5 && <span className="absolute left-3 top-3 rounded-md bg-sun-400 px-2 py-1 text-xs font-bold text-ink-900">Only {product.stock} left</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-brand-700">{product.category?.name}</p>
        <h3 className="mt-1 line-clamp-2 font-sans text-base font-bold leading-snug">{product.name}</h3>
        <p className="mt-1 truncate text-sm text-ink-500">by {product.seller?.businessName}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <p className="text-lg font-extrabold text-ink-900">{formatRWF(product.price)}</p>
          <button onClick={add} disabled={soldOut} className="btn-primary btn-sm" aria-label={`Add ${product.name} to cart`}>
            <ShoppingCart size={15} /> Add
          </button>
        </div>
      </div>
    </Link>
  );
}
