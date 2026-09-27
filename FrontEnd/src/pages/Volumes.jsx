import { useState, useEffect } from 'react'
import {
  HardDrive,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  FolderArchive,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Volumes() {
  const [volumes, setVolumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedName, setCopiedName] = useState(null)

  const fetchVolumes = async () => {
    try {
      const res = await api.get('/api/docker/volumes')
      setVolumes(res.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch Docker volumes')
      setVolumes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVolumes()
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const handleCopy = (text, name, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedName(name)
    setTimeout(() => setCopiedName(null), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Storage Volumes</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              {volumes.length} Volumes
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Persistent storage allocations, host directory bind mounts, and Docker volume lifecycle.
          </p>
        </div>

        <button
          onClick={fetchVolumes}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FF5C70]/30 bg-[#FF5C70]/10 px-4 py-3 text-[12px] text-[#FF5C70]">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Volume Inventory Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_100px_2fr_100px_110px] gap-3 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
          <span>Volume Name</span>
          <span>Driver</span>
          <span>Host Mount Path</span>
          <span>Scope</span>
          <span>Created</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {loading && volumes.length === 0 ? (
            <div className="py-16 text-center font-mono text-[12px] text-[#697384]">
              Querying Docker storage subsystem...
            </div>
          ) : volumes.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                icon={HardDrive}
                title="No volumes discovered"
                message="No named volumes or host mounts found."
              />
            </div>
          ) : (
            volumes.map((v) => (
              <div
                key={v.name}
                className="grid grid-cols-[1.5fr_100px_2fr_100px_110px] gap-3 items-center px-5 py-3 text-[12px] hover:bg-[#151B24] transition-colors"
              >
                {/* Volume Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[#F3F5F7] truncate" title={v.name}>
                    {v.name}
                  </span>
                  <button
                    onClick={(e) => handleCopy(v.name, v.name, e)}
                    title="Copy volume name"
                    className="text-[#697384] hover:text-[#36D6B4] transition"
                  >
                    {copiedName === v.name ? <Check size={10} className="text-[#36D6B4]" /> : <Copy size={10} />}
                  </button>
                </div>

                {/* Driver */}
                <div>
                  <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-[#36D6B4] uppercase">
                    {v.driver}
                  </span>
                </div>

                {/* Mount Path */}
                <div className="min-w-0 font-mono text-[11px] text-[#A7B0BE] truncate" title={v.mountpoint}>
                  {v.mountpoint}
                </div>

                {/* Scope */}
                <div className="font-mono text-[11px] text-[#697384] capitalize">
                  {v.scope || 'local'}
                </div>

                {/* Created */}
                <div className="font-mono text-[11px] text-[#697384]">
                  {formatDate(v.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
