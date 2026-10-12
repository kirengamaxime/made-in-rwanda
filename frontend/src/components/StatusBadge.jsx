const MAP = {
  pending: 'bg-sun-100 text-yellow-900', Pending: 'bg-sun-100 text-yellow-900',
  processing: 'bg-sky-100 text-sky-700', Processing: 'bg-sky-100 text-sky-700',
  approved: 'bg-brand-100 text-brand-800', successful: 'bg-brand-100 text-brand-800', Paid: 'bg-brand-100 text-brand-800', active: 'bg-brand-100 text-brand-800', Delivered: 'bg-brand-200 text-brand-900',
  Shipped: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-800', failed: 'bg-red-100 text-red-800', suspended: 'bg-red-100 text-red-800', removed: 'bg-red-100 text-red-800',
  cancelled: 'bg-ink-100 text-ink-700', Cancelled: 'bg-ink-100 text-ink-700', inactive: 'bg-ink-100 text-ink-700',
};

export default function StatusBadge({ status }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${MAP[status] || 'bg-ink-100 text-ink-700'}`}>{status}</span>;
}
