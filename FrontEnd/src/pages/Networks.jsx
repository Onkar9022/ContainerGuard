import { useState, useEffect } from 'react'
import {
  Network as NetworkIcon,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Networks() {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const fetchNetworks = async () => {
    try {
      const res = await api.get('/api/docker/networks')
      setNetworks(res.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch Docker networks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworks()
  }, [])

  function getSubnet(ipam) {
    if (!ipam || ipam.length === 0) return '—'
    return ipam[0]?.Subnet || '—'
  }

  function getGateway(ipam) {
    if (!ipam || ipam.length === 0) return '—'
    return ipam[0]?.Gateway || '—'
  }

  const handleCopy = (text, id, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Network Topology</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              {networks.length} Networks
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Docker bridge, overlay, and host virtual networks with IPAM CIDR routing tables.
          </p>
        </div>

        <button
          onClick={fetchNetworks}
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

      {/* Network Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_100px_140px_140px_100px_40px] gap-3 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
          <span>Network Name</span>
          <span>Driver</span>
          <span>Subnet / CIDR</span>
          <span>Gateway</span>
          <span>Containers</span>
          <span className="text-right">Info</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {loading && networks.length === 0 ? (
            <div className="py-16 text-center font-mono text-[12px] text-[#697384]">
              Scanning Docker network bridges...
            </div>
          ) : networks.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                icon={NetworkIcon}
                title="No networks discovered"
                message="No virtual Docker networks found on this host."
              />
            </div>
          ) : (
            networks.map((n) => {
              const isExpanded = expandedId === n.id
              const shortId = n.id?.slice(0, 12)
              return (
                <div key={n.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : n.id)}
                    className="grid grid-cols-[1.5fr_100px_140px_140px_100px_40px] gap-3 items-center px-5 py-3 text-[12px] cursor-pointer hover:bg-[#151B24] transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-[#F3F5F7]">{n.name}</p>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-[#697384]">
                        <span>{shortId}</span>
                        <button
                          onClick={(e) => handleCopy(n.id, n.id, e)}
                          title="Copy full network ID"
                          className="hover:text-[#36D6B4] transition"
                        >
                          {copiedId === n.id ? <Check size={10} className="text-[#36D6B4]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-[#36D6B4] uppercase">
                        {n.driver}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-[#A7B0BE]">
                      {getSubnet(n.ipam)}
                    </div>

                    <div className="font-mono text-[11px] text-[#697384]">
                      {getGateway(n.ipam)}
                    </div>

                    <div className="font-mono text-[11px] text-[#F3F5F7]">
                      {n.containers?.length || 0} active
                    </div>

                    <div className="flex justify-end text-[#697384]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>

                  {/* Expandable Container Attachment Details */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.05] bg-[#0D1118] p-4 text-[12px] font-mono space-y-2 animate-fade-in">
                      <div className="text-[11px] font-semibold text-[#A7B0BE] uppercase tracking-wider">
                        Attached Container Workloads:
                      </div>
                      {n.containers && n.containers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {n.containers.map((c, idx) => (
                            <div key={idx} className="rounded border border-white/5 bg-white/[0.02] p-2.5 text-[11px]">
                              <span className="font-semibold text-[#36D6B4]">{c.name || c.id?.slice(0, 12)}</span>
                              <div className="text-[#697384] text-[10px] mt-0.5">IPv4: {c.ipv4Address || 'Allocated via DHCP'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#697384] text-[11px]">No active workloads currently attached to this bridge.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
