export function Spinner({ className = 'h-6 w-6' }) {
  return <div className={`${className} animate-spin rounded-full border-2 border-brand-600 border-t-transparent`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Spinner className="h-8 w-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon size={24} />
        </div>
      )}
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {subtitle && <div className="mt-1 max-w-sm text-sm text-slate-400">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  );
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function Badge({ tone = 'slate', children }) {
  return <span className={`badge ring-1 ${TONES[tone] || TONES.slate}`}>{children}</span>;
}

export function Progress({ value, tone = 'bg-brand-600', className = '' }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'text-brand-600 bg-brand-50' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
          <div className="text-xl font-bold text-slate-900">{value}</div>
          {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
