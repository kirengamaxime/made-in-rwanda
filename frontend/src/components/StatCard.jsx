export default function StatCard({ icon: Icon, label, value, tone = 'brand', loading }) {
  const tones = { brand: 'bg-brand-50 text-brand-700', sky: 'bg-sky-50 text-sky-700', sun: 'bg-sun-100 text-yellow-800', ink: 'bg-ink-100 text-ink-700' };
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={22} /></span>
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        {loading ? <div className="skeleton mt-1 h-6 w-24" /> : <p className="truncate font-display text-2xl font-extrabold">{value}</p>}
      </div>
    </div>
  );
}
