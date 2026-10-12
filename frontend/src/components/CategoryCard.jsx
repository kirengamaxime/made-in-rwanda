import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
  return (
    <Link to={`/products?category=${category.slug}`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-brand-500">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">{category.icon}</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-bold group-hover:text-brand-700">{category.name}</span>
        <span className="block text-xs text-ink-500">{category.productCount} {category.productCount === 1 ? 'product' : 'products'}</span>
      </span>
    </Link>
  );
}
