const severityConfig = {
  critical: {
    bg: 'bg-[#FF5C70]/10',
    border: 'border-[#FF5C70]/25',
    text: 'text-[#FF5C70]',
  },
  high: {
    bg: 'bg-[#FF9B54]/10',
    border: 'border-[#FF9B54]/25',
    text: 'text-[#FF9B54]',
  },
  medium: {
    bg: 'bg-[#F2C94C]/10',
    border: 'border-[#F2C94C]/25',
    text: 'text-[#F2C94C]',
  },
  low: {
    bg: 'bg-white/5',
    border: 'border-white/10',
    text: 'text-[#A7B0BE]',
  },
  unknown: {
    bg: 'bg-white/5',
    border: 'border-white/5',
    text: 'text-[#697384]',
  },
}

export default function SeverityBadge({ severity, count, size = 'default' }) {
  const rawKey = severity?.toLowerCase() || 'unknown'
  const s = rawKey.startsWith('crit')
    ? 'critical'
    : rawKey.startsWith('warn')
    ? 'high'
    : rawKey
  const config = severityConfig[s] || severityConfig.unknown

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-semibold uppercase tracking-wider ${
        size === 'sm' ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      } ${config.bg} ${config.border} ${config.text}`}
    >
      <span>{severity}</span>
      {count !== undefined && (
        <span className="rounded bg-black/20 px-1 py-0.2 text-[9px] font-bold">
          {count}
        </span>
      )}
    </span>
  )
}
