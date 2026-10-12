export default function Field({ label, error, hint, required, children, htmlFor, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="label">{label}{required && <span className="text-red-600"> *</span>}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}
