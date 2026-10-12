import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /> Previous</button>
      <span className="text-sm font-semibold text-ink-700">Page {page} of {pages}</span>
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next <ChevronRight size={16} /></button>
    </nav>
  );
}
