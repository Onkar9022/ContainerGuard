import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, RefreshCw, AlertCircle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import SearchInput from '../components/SearchInput'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Containers() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchContainers = useCallback(async () => {
    try {
      const res = await api.get('/api/docker/containers')
      setContainers(res.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch containers')
      setContainers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContainers()
    const interval = setInterval(fetchContainers, 10000)
    return () => clearInterval(interval)
  }, [fetchContainers])

  // Derived counts
  const running = containers.filter((c) => c.state === 'running').length
  const stopped = containers.filter((c) => c.state !== 'running').length
  const total = containers.length

  // Filtering
  const filtered = containers.filter((c) => {
    const name = c.names?.[0] || ''
    const matchesSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'running' && c.state === 'running') ||
      (statusFilter === 'stopped' && c.state !== 'running')

    return matchesSearch && matchesStatus
  })

  // Format port bindings for display
  function formatPorts(ports) {
    if (!ports || ports.length === 0) return '—'
    return ports
      .filter((p) => p.PublicPort)
      .map((p) => `${p.PublicPort}→${p.PrivatePort}/${p.Type}`)
      .join(', ') || '—'
  }

  // Format creation timestamp
  function formatCreated(ts) {
    if (!ts) return '—'
    const d = new Date(ts * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Containers</h1>
            <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-text-secondary border border-border-primary">
              {total} Unit{total !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Monitor and inspect Docker containers running on your infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchContainers}
            className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Fleet stats bar */}
      <div className="flex items-center gap-3 text-[12px]">
        <span className="text-text-secondary">Active Fleet:</span>
        <span className="font-semibold text-accent-primary">{running} Running</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">{stopped} Stopped</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">Total: <span className="font-mono">{total}</span></span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2.5 text-[12px] text-status-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

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
              {s === 'all' ? `All (${total})` : s === 'running' ? `Running (${running})` : `Stopped (${stopped})`}
            </button>
          ))}
        </div>
      </div>

      {/* Container table */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_1fr_120px_120px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Container & ID</span>
          <span>Status</span>
          <span>Image</span>
          <span>Ports</span>
          <span>Created</span>
        </div>

        {/* Loading state */}
        {loading && containers.length === 0 && (
          <div className="flex items-center justify-center py-16 text-[13px] text-text-muted">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Connecting to Docker Engine...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <EmptyState
            icon={Container}
            title="No containers detected"
            message={total === 0
              ? "No containers are running on this Docker Engine. Start a container to see it here."
              : "No containers match your current search or filter."
            }
          />
        )}

        {/* Container rows */}
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/containers/${c.id}`)}
            className="grid grid-cols-[1fr_100px_1fr_120px_120px] gap-3 items-center px-5 py-3 border-b border-border-primary last:border-b-0 text-[12px] cursor-pointer transition hover:bg-bg-hover"
          >
            <div>
              <p className="font-medium text-text-primary truncate">{c.names?.[0] || '—'}</p>
              <p className="font-mono text-[10px] text-text-muted truncate">{c.id.slice(0, 12)}</p>
            </div>
            <StatusBadge status={c.state} />
            <p className="text-text-secondary truncate">{c.image}</p>
            <p className="font-mono text-[11px] text-text-muted truncate">{formatPorts(c.ports)}</p>
            <p className="text-text-muted">{formatCreated(c.created)}</p>
          </div>
        ))}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          <span>Showing {filtered.length} of {total} containers</span>
          <span>Docker Engine: Connected</span>
        </div>
      </div>
    </div>
  )
}
