import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide = false, footer, closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && closeOnBackdrop) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose, closeOnBackdrop]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && closeOnBackdrop) onClose(); }} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          {closeOnBackdrop && <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-ink-100" aria-label="Close"><X size={20} /></button>}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
