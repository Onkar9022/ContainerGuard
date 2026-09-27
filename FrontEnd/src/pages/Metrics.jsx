import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  BarChart3,
  RefreshCw,
  Cpu,
  Database,
  Network,
  HardDrive,
  Activity,
  Zap,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import ChartTooltip from '../components/ChartTooltip'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Metrics() {
  const [containers, setContainers] = useState([])
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  // 1. Load containers
  useEffect(() => {
    async function loadContainers() {
      try {
        const res = await api.get('/api/docker/containers')
        const list = res.data || []
        setContainers(list)
        if (list.length > 0 && !selectedContainerId) {
          const firstRunning = list.find((c) => c.state === 'running') || list[0]
          setSelectedContainerId(firstRunning.id)
        }
      } catch {
        setContainers([])
      }
    }
    loadContainers()
  }, [])

  // 2. Fetch history for the selected container
  useEffect(() => {
    if (!selectedContainerId) return

    async function loadHistory() {
      setLoading(true)
      try {
        const res = await api.get(`/api/metrics/${selectedContainerId}/history?limit=30`)
        const data = res.data || []
        const formatted = data.slice().reverse().map((m) => {
          const d = new Date(m.timestamp)
          const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
          return {
            time: timeStr,
            cpu: Number((m.cpuPercent || 0).toFixed(1)),
            memoryMb: Number(((m.memoryUsage || 0) / (1024 * 1024)).toFixed(1)),
            memoryPercent: Number((m.memoryPercent || 0).toFixed(1)),
            networkRxMb: Number(((m.networkRxBytes || 0) / (1024 * 1024)).toFixed(2)),
            networkTxMb: Number(((m.networkTxBytes || 0) / (1024 * 1024)).toFixed(2)),
            blockReadMb: Number(((m.blockReadBytes || 0) / (1024 * 1024)).toFixed(2)),
            blockWriteMb: Number(((m.blockWriteBytes || 0) / (1024 * 1024)).toFixed(2)),
          }
        })
        setHistory(formatted)
      } catch {
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
    const timer = setInterval(loadHistory, 10000)
    return () => clearInterval(timer)
  }, [selectedContainerId])

  const latestMetric = history[history.length - 1] || null
  const selectedContainer = containers.find((c) => c.id === selectedContainerId)
  const containerName = selectedContainer?.names?.[0]?.replace(/^\//, '') || selectedContainerId.slice(0, 12)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Metrics Telemetry</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              Continuous Sampling
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Real-time workload resource telemetry collected from Docker Engine socket and persisted to PostgreSQL.
          </p>
        </div>

        {/* Container Target Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedContainerId}
            onChange={(e) => setSelectedContainerId(e.target.value)}
            className="h-9 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 font-mono text-[12px] text-[#F3F5F7] outline-none transition focus:border-[#36D6B4]/50 focus:bg-[#151B24]"
          >
            {containers.length === 0 ? (
              <option value="">No containers found</option>
            ) : (
              containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12)} ({c.state})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          label="CPU UTILIZATION"
          value={latestMetric ? `${latestMetric.cpu}%` : '0.0%'}
          subValue={<span className="font-mono text-[11px] text-[#A7B0BE]">Container: {containerName}</span>}
          badge={latestMetric?.cpu > 80 ? 'HIGH' : 'NORMAL'}
          badgeType={latestMetric?.cpu > 80 ? 'critical' : 'teal'}
        />

        <StatCard
          icon={Database}
          label="MEMORY ALLOCATION"
          value={latestMetric ? `${latestMetric.memoryMb} MB` : '0 MB'}
          subValue={
            <span className="font-mono text-[11px] text-[#A7B0BE]">
              {latestMetric ? `${latestMetric.memoryPercent}% of cgroup limit` : '—'}
            </span>
          }
          badge={latestMetric?.memoryPercent > 80 ? 'HIGH' : 'STABLE'}
          badgeType={latestMetric?.memoryPercent > 80 ? 'critical' : 'teal'}
        />

        <StatCard
          icon={Network}
          label="NETWORK INBOUND (RX)"
          value={latestMetric ? `${latestMetric.networkRxMb} MB` : '0.00 MB'}
          subValue={
            <span className="font-mono text-[11px] text-[#A7B0BE]">
              Tx: {latestMetric?.networkTxMb || '0.00'} MB
            </span>
          }
          badge="ETHERNET"
          badgeType="neutral"
        />

        <StatCard
          icon={HardDrive}
          label="BLOCK STORAGE I/O"
          value={latestMetric ? `${latestMetric.blockReadMb} MB` : '0.00 MB'}
          subValue={
            <span className="font-mono text-[11px] text-[#A7B0BE]">
              Write: {latestMetric?.blockWriteMb || '0.00'} MB
            </span>
          }
          badge="HOST I/O"
          badgeType="neutral"
        />
      </div>

      {/* Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: CPU Utilization */}
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#36D6B4]" />
              <h2 className="text-[13px] font-semibold text-[#F3F5F7]">CPU Utilization History</h2>
            </div>
            <span className="font-mono text-[10px] text-[#36D6B4]">PERCENTAGE (%)</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricsCpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#36D6B4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#36D6B4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#36D6B4" strokeWidth={1.8} fill="url(#metricsCpuGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Memory Usage */}
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[#6EA8FF]" />
              <h2 className="text-[13px] font-semibold text-[#F3F5F7]">Memory Consumption (MB)</h2>
            </div>
            <span className="font-mono text-[10px] text-[#6EA8FF]">RESIDENT MEMORY</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricsMemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EA8FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6EA8FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip unit="MB" />} />
                <Area type="monotone" dataKey="memoryMb" name="Memory" stroke="#6EA8FF" strokeWidth={1.8} fill="url(#metricsMemGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Network Throughput */}
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Network size={14} className="text-[#35D399]" />
              <h2 className="text-[13px] font-semibold text-[#F3F5F7]">Network I/O Throughput</h2>
            </div>
            <span className="font-mono text-[10px] text-[#35D399]">Rx / Tx MB</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip unit="MB" />} />
                <Line type="monotone" dataKey="networkRxMb" name="Inbound (Rx)" stroke="#35D399" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="networkTxMb" name="Outbound (Tx)" stroke="#FF9B54" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Block Storage I/O */}
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-[#F2C94C]" />
              <h2 className="text-[13px] font-semibold text-[#F3F5F7]">Block Storage I/O</h2>
            </div>
            <span className="font-mono text-[10px] text-[#F2C94C]">READ / WRITE MB</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip unit="MB" />} />
                <Line type="monotone" dataKey="blockReadMb" name="Disk Read" stroke="#F2C94C" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="blockWriteMb" name="Disk Write" stroke="#FF5C70" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
