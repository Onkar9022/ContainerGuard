export default function ProgressBar({ value = 0, max = 100, color = 'bg-accent-primary', size = 'sm', showLabel = false }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-bg-elevated ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full ${color} animate-fill-bar transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-text-secondary">{pct.toFixed(0)}%</span>
      )}
    </div>
  )
}
