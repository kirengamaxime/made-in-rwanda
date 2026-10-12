export default function Logo({ light = false, size = 36 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#20603D" />
        <path d="M2 32a30 30 0 0 1 60 0Z" fill="#00A1DE" />
        <path d="M4 32h56a30 30 0 0 1-2 8H6a30 30 0 0 1-2-8Z" fill="#FAD201" />
        <path d="M32 14l6 8-6 8-6-8z" fill="#fff" opacity=".9" />
      </svg>
      <span className={`font-display text-lg font-extrabold leading-none tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
        Made in Rwanda
        <span className={`mt-0.5 block text-[11px] font-semibold tracking-normal ${light ? 'text-sun-300' : 'text-brand-700'}`}>Marketplace</span>
      </span>
    </span>
  );
}
