const severityConfig = {
  critical: { bg: 'bg-severity-critical', text: 'text-white' },
  high:     { bg: 'bg-severity-high', text: 'text-white' },
  medium:   { bg: 'bg-severity-medium', text: 'text-black' },
  low:      { bg: 'bg-severity-low', text: 'text-white' },
}

export default function SeverityBadge({ severity, count }) {
  const s = severity?.toLowerCase() || 'low'
  const config = severityConfig[s] || severityConfig.low

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase ${config.bg} ${config.text}`}>
      {severity}
      {count !== undefined && <span className="ml-0.5">{count}</span>}
    </span>
  )
}
