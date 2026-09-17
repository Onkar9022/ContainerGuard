import { useState } from 'react'
import { Container, Plus, RefreshCw, Trash2, RotateCcw, Pause, Square } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import SearchInput from '../components/SearchInput'
import EmptyState from '../components/EmptyState'

export default function Containers() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Real container data will come from GET /api/containers in Phase 4
  const containers = []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Containers</h1>
            <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-text-secondary border border-border-primary">
              0 Units
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Monitor and manage Docker containers running on your infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <RefreshCw size={13} />
            Auto 5s
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <Trash2 size={13} />
            Prune Stopped
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-accent-primary/50 bg-accent-primary/10 px-3 py-1.5 text-[12px] font-semibold text-accent-primary transition hover:bg-accent-primary/20">
            <Plus size={13} />
            Create / Run Container
          </button>
        </div>
      </div>

      {/* Fleet stats bar */}
      <div className="flex items-center gap-3 text-[12px]">
        <span className="text-text-secondary">Active Fleet:</span>
        <span className="font-semibold text-accent-primary">0 Running</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">0 Stopped</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">Fleet Mem: <span className="font-mono">0 MB</span> / <span className="font-mono">— GB</span></span>
        <span className="ml-3 flex items-center gap-1.5 text-accent-primary">
          <Shield size={12} />
          Security: —
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder="Search container name, ID or image..."
          value={search}
          onChange={setSearch}
          className="w-96"
        />
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-text-muted mr-1">Status:</span>
          {['all', 'running', 'stopped'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 font-medium capitalize transition ${
                statusFilter === s
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s === 'all' ? 'All (0)' : `${s} (0)`}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar (shown when containers are selected) */}
      <div className="flex items-center gap-2 rounded-lg border border-border-primary bg-bg-surface px-4 py-2 text-[12px]">
        <span className="text-accent-primary font-medium">● 0 containers selected</span>
        <span className="mx-2 text-text-muted">|</span>
        <button className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition">
          <RotateCcw size={12} /> Restart
        </button>
        <button className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition">
          <Pause size={12} /> Pause
        </button>
        <button className="flex items-center gap-1 text-text-secondary hover:text-status-error transition">
          <Square size={12} /> Terminate
        </button>
      </div>

      {/* Container table */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[24px_1fr_100px_1fr_100px_120px_140px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span><input type="checkbox" className="accent-accent-primary" /></span>
          <span>Container & ID</span>
          <span>Status</span>
          <span>Image & Tag</span>
          <span>CPU Usage</span>
          <span>Memory Usage</span>
          <span>Network (TX / RX)</span>
        </div>

        {/* Empty state */}
        {containers.length === 0 && (
          <EmptyState
            icon={Container}
            title="No containers detected"
            message="Docker Engine integration will be added in Phase 4. Once connected, your running containers will appear here with real-time metrics."
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          <span className="font-mono">Pro-tip: containerguard exec -it {'<id>'} sh</span>
          <div className="flex items-center gap-3">
            <span>Showing 0 of 0 containers</span>
            <span className="text-text-muted">Rows: 10</span>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-medium text-text-secondary">Compute Utilization</p>
            <span className="text-[11px] text-accent-primary">Normal Threshold</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border-secondary">
              <span className="text-[14px] font-bold text-text-muted font-mono">—%</span>
            </div>
            <div>
              <p className="text-[12px] text-text-secondary">Core Load: — / — VCPU</p>
              <p className="text-[11px] text-text-muted">Load Avg: —</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-medium text-text-secondary">Volume Allocations</p>
            <span className="text-[11px] text-accent-primary">0 Mounted</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border-secondary">
              <span className="text-[14px] font-bold text-text-muted font-mono">—%</span>
            </div>
            <div>
              <p className="text-[12px] text-text-secondary">SSD Pool: — / — GB</p>
              <p className="text-[11px] text-text-muted">NVMe Write: —</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-medium text-text-secondary">Orchestration Health</p>
            <span className="text-[11px] text-accent-primary">—% Uptime</span>
          </div>
          <div className="mt-2">
            <p className="flex items-center gap-2 text-[12px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-text-muted" />
              Docker Engine —
            </p>
            <p className="text-[11px] text-text-muted mt-1">Containerd Runtime —</p>
            <button className="mt-2 text-[11px] font-medium text-text-secondary hover:text-accent-primary transition">
              Diagnostics →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Shield(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  )
}
