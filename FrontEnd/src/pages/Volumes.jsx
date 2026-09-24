import { useState, useEffect } from 'react'
import { HardDrive, RefreshCw, AlertCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Volumes() {
  const [volumes, setVolumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/docker/volumes')
        setVolumes(res.data || [])
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch volumes')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">Volumes</h1>
          <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-text-secondary border border-border-primary">
            {volumes.length} Volume{volumes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-text-secondary">
          Docker volume inventory and storage allocation tracking.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2.5 text-[12px] text-status-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1fr_100px_100px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Volume Name</span>
          <span>Driver</span>
          <span>Mount Point</span>
          <span>Scope</span>
          <span>Created</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-[13px] text-text-muted">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading volumes...
          </div>
        )}

        {/* Empty */}
        {!loading && volumes.length === 0 && !error && (
          <EmptyState
            icon={HardDrive}
            title="No volumes discovered"
            message="No Docker volumes found on this engine."
          />
        )}

        {/* Volume rows */}
        {volumes.map((v) => (
          <div
            key={v.name}
            className="grid grid-cols-[1fr_100px_1fr_100px_100px] gap-3 items-center px-5 py-3 border-b border-border-primary last:border-b-0 text-[12px] hover:bg-bg-hover transition"
          >
            <div>
              <p className="text-text-primary font-medium truncate">{v.name}</p>
            </div>
            <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary text-center">
              {v.driver}
            </span>
            <span className="font-mono text-[11px] text-text-muted truncate">{v.mountpoint}</span>
            <span className="text-text-secondary capitalize">{v.scope}</span>
            <span className="text-text-muted">{formatDate(v.createdAt)}</span>
          </div>
        ))}

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing {volumes.length} volumes
        </div>
      </div>
    </div>
  )
}
