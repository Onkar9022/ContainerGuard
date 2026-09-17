import { useState } from 'react'
import { ScrollText, Search, Download, Pause, Play, RefreshCw } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Logs() {
  const [search, setSearch] = useState('')
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Logs</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            View and search real-time container log streams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary"
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <RefreshCw size={13} />
            Auto-refresh
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <Download size={13} />
            Download
          </button>
        </div>
      </div>

      {/* Container selector + search */}
      <div className="flex items-center gap-3">
        <select className="h-9 rounded-lg border border-border-primary bg-bg-tertiary px-3 text-[12px] text-text-primary outline-none">
          <option>Select container...</option>
        </select>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border-primary bg-bg-tertiary pl-9 pr-3 text-[12px] text-text-primary placeholder-text-muted outline-none transition focus:border-accent-primary/50"
          />
        </div>
        <select className="h-9 rounded-lg border border-border-primary bg-bg-tertiary px-3 text-[12px] text-text-primary outline-none">
          <option>Tail: 100 lines</option>
          <option>Tail: 500 lines</option>
          <option>Tail: 1000 lines</option>
          <option>All</option>
        </select>
      </div>

      {/* Log viewer */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-2 text-[11px]">
          <span className="text-text-muted font-mono">Container Logs</span>
          <span className="text-text-muted">0 lines</span>
        </div>
        <div className="min-h-[400px] bg-[#0a0c10]">
          <EmptyState
            icon={ScrollText}
            title="No log streams available"
            message="Docker container logs will be available after Docker Engine integration in Phase 10. Select a container to view its stdout/stderr output."
          />
        </div>
      </div>
    </div>
  )
}
