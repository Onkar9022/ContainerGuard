import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, RefreshCw } from 'lucide-react'
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
        // Prisma returns newest first, reverse so chart goes left-to-right (chronological)
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Metrics</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Continuous resource utilization metrics collected from Docker Engine and persisted to PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedContainerId}
            onChange={(e) => setSelectedContainerId(e.target.value)}
            className="h-9 rounded-lg border border-border-primary bg-bg-tertiary px-3 text-[12px] text-text-primary outline-none focus:border-accent-primary/50"
          >
            {containers.length === 0 ? (
              <option value="">No containers found</option>
            ) : (
              containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names?.[0] || c.id.slice(0, 12)} ({c.state})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-[13px] text-text-muted">
          <RefreshCw size={16} className="animate-spin mr-2" />
          Loading container telemetry...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-border-primary bg-bg-surface p-12">
          <EmptyState
            icon={BarChart3}
            title="No metrics collected yet"
            message="The background metrics worker gathers stats every 5s for running containers. Ensure the selected container is running."
          />
        </div>
      ) : (
        /* Charts grid */
        <div className="grid grid-cols-2 gap-4">
          {/* CPU chart */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">CPU Usage (%)</h3>
            <p className="text-[11px] text-text-muted mb-4">Percentage of host CPU capacity consumed</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="metricsCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131620', borderColor: '#232838', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#00d4aa" fill="url(#metricsCpu)" strokeWidth={1.5} name="CPU %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory chart */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">Memory Usage (MB)</h3>
            <p className="text-[11px] text-text-muted mb-4">Resident memory allocated to container</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="metricsMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131620', borderColor: '#232838', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="memoryMb" stroke="#3b82f6" fill="url(#metricsMem)" strokeWidth={1.5} name="RAM MB" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network chart */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5 col-span-2">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">Network Throughput (MB)</h3>
            <p className="text-[11px] text-text-muted mb-4">Aggregated ingress (Rx) and egress (Tx) traffic</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="metricsRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="metricsTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131620', borderColor: '#232838', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="networkRxMb" stroke="#00d4aa" fill="url(#metricsRx)" strokeWidth={1.5} name="Rx (MB)" />
                  <Area type="monotone" dataKey="networkTxMb" stroke="#8b5cf6" fill="url(#metricsTx)" strokeWidth={1.5} name="Tx (MB)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
