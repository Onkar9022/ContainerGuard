const statusConfig = {
  running: {
    bg: 'bg-[#35D399]/10',
    border: 'border-[#35D399]/20',
    text: 'text-[#35D399]',
    dot: 'bg-[#35D399] shadow-[0_0_6px_#35D399]',
    animate: true,
  },
  healthy: {
    bg: 'bg-[#35D399]/10',
    border: 'border-[#35D399]/20',
    text: 'text-[#35D399]',
    dot: 'bg-[#35D399] shadow-[0_0_6px_#35D399]',
    animate: true,
  },
  exited: {
    bg: 'bg-white/5',
    border: 'border-white/5',
    text: 'text-[#A7B0BE]',
    dot: 'bg-[#697384]',
    animate: false,
  },
  stopped: {
    bg: 'bg-white/5',
    border: 'border-white/5',
    text: 'text-[#A7B0BE]',
    dot: 'bg-[#697384]',
    animate: false,
  },
  paused: {
    bg: 'bg-[#FF9B54]/10',
    border: 'border-[#FF9B54]/20',
    text: 'text-[#FF9B54]',
    dot: 'bg-[#FF9B54]',
    animate: false,
  },
  restarting: {
    bg: 'bg-[#F2C94C]/10',
    border: 'border-[#F2C94C]/20',
    text: 'text-[#F2C94C]',
    dot: 'bg-[#F2C94C]',
    animate: true,
  },
  unhealthy: {
    bg: 'bg-[#FF5C70]/10',
    border: 'border-[#FF5C70]/20',
    text: 'text-[#FF5C70]',
    dot: 'bg-[#FF5C70]',
    animate: false,
  },
  dead: {
    bg: 'bg-[#FF5C70]/10',
    border: 'border-[#FF5C70]/20',
    text: 'text-[#FF5C70]',
    dot: 'bg-[#FF5C70]',
    animate: false,
  },
  created: {
    bg: 'bg-[#6EA8FF]/10',
    border: 'border-[#6EA8FF]/20',
    text: 'text-[#6EA8FF]',
    dot: 'bg-[#6EA8FF]',
    animate: false,
  },
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase() || 'stopped'
  const config = statusConfig[s] || statusConfig.stopped

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium capitalize ${config.bg} ${config.border} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot} ${
          config.animate ? 'animate-pulse-dot' : ''
        }`}
      />
      {status || 'Unknown'}
    </span>
  )
}
