import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, Square, RotateCcw, Terminal, Copy, Container } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function ContainerDetail() {
  const { id } = useParams()
  const tabs = ['Overview', 'Logs', 'Inspect', 'Environment', 'Mounts', 'Networks']

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]">
        <Link to="/containers" className="flex items-center gap-1 text-text-secondary hover:text-accent-primary transition">
          <ArrowLeft size={14} />
          Containers
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium font-mono">{id?.slice(0, 12)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Container Details</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[12px] text-text-secondary">{id}</span>
            <button className="text-text-muted hover:text-text-primary transition">
              <Copy size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-accent-primary hover:bg-accent-primary/10 transition">
            <Play size={13} /> Start
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-status-warning transition">
            <RotateCcw size={13} /> Restart
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-status-error transition">
            <Square size={13} /> Stop
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition">
            <Terminal size={13} /> Exec
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-primary">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-[12px] font-medium transition border-b-2 ${
              i === 0
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <EmptyState
        icon={Container}
        title="Container data not available"
        message="Docker Engine integration will be added in Phase 4. Connect to Docker to view real container details, metrics, logs, and configuration."
      />
    </div>
  )
}
