const statusConfig = {
  running: { bg: 'bg-status-running/15', text: 'text-status-running', dot: 'bg-status-running' },
  exited:  { bg: 'bg-status-stopped/15', text: 'text-status-stopped', dot: 'bg-status-stopped' },
  stopped: { bg: 'bg-status-stopped/15', text: 'text-status-stopped', dot: 'bg-status-stopped' },
  paused:  { bg: 'bg-status-warning/15', text: 'text-status-warning', dot: 'bg-status-warning' },
  dead:    { bg: 'bg-status-error/15', text: 'text-status-error', dot: 'bg-status-error' },
  created: { bg: 'bg-chart-blue/15', text: 'text-chart-blue', dot: 'bg-chart-blue' },
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase() || 'stopped'
  const config = statusConfig[s] || statusConfig.stopped

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status || 'Unknown'}
    </span>
  )
}
