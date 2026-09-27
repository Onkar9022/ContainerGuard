import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container as ContainerIcon,
  RefreshCw,
  Search,
  Copy,
  Check,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import SearchInput from '../components/SearchInput'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Containers() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, running, stopped
  const [containers, setContainers] = useState([])
  const [liveMetrics, setLiveMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const navigate = useNavigate()

  const fetchContainersAndMetrics = useCallback(async () => {
    try {
      const [contRes, metricsRes] = await Promise.allSettled([
        api.get('/api/docker/containers'),
        api.get('/api/metrics'),
      ])

      if (contRes.status === 'fulfilled') setContainers(contRes.value?.data || [])
      if (metricsRes.status === 'fulfilled') setLiveMetrics(metricsRes.value?.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContainersAndMetrics()
    const interval = setInterval(fetchContainersAndMetrics, 10000)
    return () => clearInterval(interval)
  }, [fetchContainersAndMetrics])

  // Copy helper
  const handleCopy = (text, id, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Smart image string format: simplifies long ECR or registry URLs
  function formatImageString(image) {
    if (!image) return '—'
    const parts = image.split('/')
    return parts[parts.length - 1] // returns e.g. containerguard-backend:a03dd32a
  }

  // Filtered containers
  const filtered = containers.filter((c) => {
    const name = c.names?.[0]?.replace(/^\//, '') || ''
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

  // Map live metrics by containerId
  const metricsMap = new Map()
  for (const m of liveMetrics) {
    if (m.containerId) metricsMap.set(m.containerId, m)
  }

  const runningCount = containers.filter((c) => c.state === 'running').length
  const stoppedCount = containers.filter((c) => c.state !== 'running').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Containers</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              {containers.length} Units
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Docker Engine workload inventory, live runtime statistics, and container lifecycle inspect.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchContainersAndMetrics}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-2.5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All', count: containers.length },
            { id: 'running', label: 'Running', count: runningCount },
            { id: 'stopped', label: 'Stopped', count: stoppedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                  : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-[#697384]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search by name, image, or ID..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* Docker Desktop-Inspired Container Workstation Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        {/* Table Column Header */}
        <div className="grid grid-cols-[1.5fr_100px_1.5fr_120px_120px_60px] gap-3 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
          <span>Workload / Container</span>
          <span>State</span>
          <span>Image Tag</span>
          <span>CPU Utilization</span>
          <span>Memory Usage</span>
          <span className="text-right">Action</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                icon={ContainerIcon}
                title="No matching containers found"
                message={
                  search
                    ? `No containers match your search query "${search}".`
                    : 'No Docker containers found on this engine.'
                }
              />
            </div>
          ) : (
            filtered.map((c) => {
              const metric = metricsMap.get(c.id)
              const containerName = c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12)
              const shortId = c.id.slice(0, 12)
              const formattedImage = formatImageString(c.image)

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/containers/${c.id}`)}
                  className="grid grid-cols-[1.5fr_100px_1.5fr_120px_120px_60px] gap-3 items-center px-5 py-3 text-[12px] cursor-pointer hover:bg-[#151B24] transition-colors"
                >
                  {/* Container Name & ID */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-[#36D6B4]">
                      <ContainerIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#F3F5F7] truncate">{containerName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#697384]">{shortId}</span>
                        <button
                          onClick={(e) => handleCopy(c.id, c.id, e)}
                          title="Copy full ID"
                          className="text-[#697384] hover:text-[#36D6B4] transition"
                        >
                          {copiedId === c.id ? <Check size={10} className="text-[#36D6B4]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={c.state} />
                  </div>

                  {/* Image Tag */}
                  <div className="min-w-0">
                    <span
                      title={c.image}
                      className="font-mono text-[11px] text-[#A7B0BE] hover:text-[#F3F5F7] truncate block"
                    >
                      {formattedImage}
                    </span>
                  </div>

                  {/* CPU Meter */}
                  <div className="min-w-0">
                    {metric ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-[#A7B0BE]">{metric.cpuPercent?.toFixed(1) || '0'}%</span>
                        </div>
                        <ProgressBar value={metric.cpuPercent || 0} max={100} size="xs" color="teal" />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#697384]">0.0%</span>
                    )}
                  </div>

                  {/* Memory Meter */}
                  <div className="min-w-0">
                    {metric ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-[#A7B0BE]">
                            {((metric.memoryUsage || 0) / (1024 * 1024)).toFixed(0)} MB
                          </span>
                        </div>
                        <ProgressBar
                          value={metric.memoryPercent || 0}
                          max={100}
                          size="xs"
                          color={metric.memoryPercent > 80 ? 'critical' : 'blue'}
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#697384]">0 MB</span>
                    )}
                  </div>

                  {/* Action / Inspect */}
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/containers/${c.id}`)
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/5 text-[#697384] hover:bg-white/5 hover:text-[#36D6B4] transition"
                      title="Inspect container"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
