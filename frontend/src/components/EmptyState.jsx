export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      {Icon && <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon size={26} /></span>}
      <h3 className="text-lg font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
