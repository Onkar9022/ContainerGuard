export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'teal',
  size = 'sm',
  showLabel = false,
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorClasses = {
    teal: 'bg-[#36D6B4]',
    warning: 'bg-[#FF9B54]',
    critical: 'bg-[#FF5C70]',
    blue: 'bg-[#6EA8FF]',
  }

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }

  const fillClass = colorClasses[color] || color

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-white/[0.07] ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full ${fillClass} transition-all duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-[11px] text-[#A7B0BE]">{pct.toFixed(0)}%</span>
      )}
    </div>
  )
}
