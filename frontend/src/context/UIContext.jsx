import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const COLORS = { success: 'border-brand-500 text-brand-800', error: 'border-red-500 text-red-800', info: 'border-sky-500 text-sky-700' };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const toast = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const closeDialog = (result) => { dialog.resolve(result); setDialog(null); };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 bg-white p-3.5 shadow-lg ring-1 ring-ink-100 ${COLORS[t.type]}`}>
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm font-medium text-ink-900">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-ink-500 hover:text-ink-900"><X size={16} /></button>
            </div>
          );
        })}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/50 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{dialog.title || 'Are you sure?'}</h3>
            {dialog.message && <p className="mt-2 text-sm text-ink-500">{dialog.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => closeDialog(false)}>{dialog.cancelText || 'Cancel'}</button>
              <button className={dialog.danger ? 'btn-danger' : 'btn-primary'} onClick={() => closeDialog(true)} autoFocus>{dialog.confirmText || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
