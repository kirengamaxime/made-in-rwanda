export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />;

export const ProductCardSkeleton = () => (
  <div className="card overflow-hidden">
    <div className="skeleton aspect-square rounded-none" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-8 w-16" /></div>
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);

export const PageSpinner = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-100 border-t-brand-700" />
  </div>
);
