import { useState, useEffect } from 'react'
import { Network as NetworkIcon, RefreshCw, AlertCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Networks() {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/docker/networks')
        setNetworks(res.data || [])
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch networks')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function getSubnet(ipam) {
    if (!ipam || ipam.length === 0) return '—'
    return ipam[0]?.Subnet || '—'
  }

  function getGateway(ipam) {
    if (!ipam || ipam.length === 0) return '—'
    return ipam[0]?.Gateway || '—'
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">Networks</h1>
          <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-text-secondary border border-border-primary">
            {networks.length} Network{networks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-text-secondary">
          Docker network topology and container connectivity mapping.
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
        <div className="grid grid-cols-[1fr_100px_140px_120px_80px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Network Name</span>
          <span>Driver</span>
          <span>Subnet</span>
          <span>Gateway</span>
          <span>Containers</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-[13px] text-text-muted">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading networks...
          </div>
        )}

        {/* Empty */}
        {!loading && networks.length === 0 && !error && (
          <EmptyState
            icon={NetworkIcon}
            title="No networks discovered"
            message="No Docker networks found on this engine."
          />
        )}

        {/* Network rows */}
        {networks.map((n) => (
          <div
            key={n.id}
            className="grid grid-cols-[1fr_100px_140px_120px_80px] gap-3 items-center px-5 py-3 border-b border-border-primary last:border-b-0 text-[12px] hover:bg-bg-hover transition"
          >
            <div>
              <p className="text-text-primary font-medium">{n.name}</p>
              <p className="font-mono text-[10px] text-text-muted">{n.id?.slice(0, 12)}</p>
            </div>
            <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary text-center">
              {n.driver}
            </span>
            <span className="font-mono text-[11px] text-text-muted">{getSubnet(n.ipam)}</span>
            <span className="font-mono text-[11px] text-text-muted">{getGateway(n.ipam)}</span>
            <span className="text-text-secondary font-mono">{n.containers?.length || 0}</span>
          </div>
        ))}

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing {networks.length} networks
        </div>
      </div>

      {/* Network detail — connected containers */}
      {networks.filter((n) => n.containers?.length > 0).map((n) => (
        <div key={n.id} className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <h3 className="text-[13px] font-semibold text-text-primary mb-3">
            {n.name} — Connected Containers
          </h3>
          <div className="space-y-1.5">
            {n.containers.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border-primary py-1.5 last:border-0 text-[12px]">
                <span className="text-text-secondary">{c.name || c.id?.slice(0, 12)}</span>
                <span className="font-mono text-text-muted">{c.ipv4 || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
