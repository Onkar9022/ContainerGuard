export default function StatCard({ icon: Icon, label, value, subValue, trend, className = '' }) {
  return (
    <div className={`rounded-xl border border-border-primary bg-bg-surface p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-text-primary">
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-[12px] text-text-secondary">{subValue}</p>
          )}
          {trend && (
            <p className={`mt-1 text-[12px] font-medium ${trend.startsWith('+') || trend.startsWith('↑') ? 'text-accent-primary' : 'text-severity-critical'}`}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-bg-elevated p-2 text-text-muted">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}
