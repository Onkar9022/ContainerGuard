import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Container as ContainerIcon,
  Activity,
  Terminal,
  Key,
  HardDrive,
  Network,
  Play,
  Pause,
  Trash2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import StatusBadge from '../components/StatusBadge'
import ChartTooltip from '../components/ChartTooltip'
import api from '../services/api'

export default function ContainerDetail() {
  const { id } = useParams()
  const [container, setContainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [copiedText, setCopiedText] = useState(null)

  // Metrics telemetry state
  const [metricsHistory, setMetricsHistory] = useState([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // Logs state
  const [logs, setLogs] = useState([])
  const [logStatus, setLogStatus] = useState('disconnected')
  const [isFollowing, setIsFollowing] = useState(true)
  const socketRef = useRef(null)
  const logsEndRef = useRef(null)

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: ContainerIcon },
    { id: 'Metrics', label: 'Metrics', icon: Activity },
    { id: 'Live Logs', label: 'Live Logs', icon: Terminal },
    { id: 'Environment', label: 'Environment', icon: Key },
    { id: 'Mounts', label: 'Mounts', icon: HardDrive },
    { id: 'Networks', label: 'Networks', icon: Network },
  ]

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedText(key)
    setTimeout(() => setCopiedText(null), 1500)
  }

  // 1. Fetch container inspect data
  useEffect(() => {
    const fetchInspect = async () => {
      try {
        const res = await api.get(`/api/docker/containers/${id}`)
        setContainer(res.data)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to inspect container')
      } finally {
        setLoading(false)
      }
    }
    fetchInspect()
  }, [id])

  // 2. Fetch container metrics history when on Metrics tab
  useEffect(() => {
    if (activeTab === 'Metrics') {
      const fetchHistory = async () => {
        setLoadingMetrics(true)
        try {
          const res = await api.get(`/api/metrics/${id}/history?limit=25`)
          const list = res.data || []
          const formatted = list.slice().reverse().map((m) => {
            const d = new Date(m.timestamp)
            return {
              time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`,
              cpu: Number((m.cpuPercent || 0).toFixed(1)),
              memoryMb: Number(((m.memoryUsage || 0) / (1024 * 1024)).toFixed(1)),
              netRxMb: Number(((m.networkRxBytes || 0) / (1024 * 1024)).toFixed(2)),
              netTxMb: Number(((m.networkTxBytes || 0) / (1024 * 1024)).toFixed(2)),
              ioReadMb: Number(((m.blockReadBytes || 0) / (1024 * 1024)).toFixed(2)),
              ioWriteMb: Number(((m.blockWriteBytes || 0) / (1024 * 1024)).toFixed(2)),
            }
          })
          setMetricsHistory(formatted)
        } catch {
          setMetricsHistory([])
        } finally {
          setLoadingMetrics(false)
        }
      }
      fetchHistory()
      const timer = setInterval(fetchHistory, 10000)
      return () => clearInterval(timer)
    }
  }, [activeTab, id])

  // 3. Socket.IO Live Log Streaming
  useEffect(() => {
    if (activeTab === 'Live Logs' && !socketRef.current) {
      const backendUrl = import.meta.env.VITE_API_URL !== undefined
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.PROD ? undefined : 'http://localhost:5000')

      const socket = io(backendUrl || undefined, { transports: ['websocket', 'polling'] })
      socketRef.current = socket

      socket.on('connect', () => {
        setLogStatus('connected')
        socket.emit('logs:start', { containerId: id })
      })

      socket.on('logs:status', ({ status }) => setLogStatus(status))
      socket.on('logs:data', (entry) => {
        setLogs((prev) => [...prev.slice(-999), entry])
      })
    }

    return () => {
      if (activeTab !== 'Live Logs' && socketRef.current) {
        socketRef.current.emit('logs:stop')
        socketRef.current.disconnect()
        socketRef.current = null
        setLogStatus('disconnected')
      }
    }
  }, [activeTab, id])

  // Auto-scroll logs
  useEffect(() => {
    if (isFollowing && logsEndRef.current && activeTab === 'Live Logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isFollowing, activeTab])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-[13px] text-[#697384]">
        <RefreshCw size={16} className="animate-spin mr-2 text-[#36D6B4]" />
        Connecting to Docker daemon for container inspection...
      </div>
    )
  }

  if (error || !container) {
    return (
      <div className="space-y-4">
        <Link to="/containers" className="inline-flex items-center gap-1.5 text-[12px] text-[#A7B0BE] hover:text-[#36D6B4]">
          <ArrowLeft size={14} /> Back to Containers
        </Link>
        <div className="rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/10 p-5 text-[13px] text-[#FF5C70]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={16} /> Inspection Failed
          </div>
          <p className="mt-1 text-[#A7B0BE]">{error || 'Container not found.'}</p>
        </div>
      </div>
    )
  }

  const containerName = container.Name?.replace(/^\//, '') || id.slice(0, 12)
  const isRunning = container.State?.Running

  return (
    <div className="space-y-5">
      {/* Back button */}
      <div>
        <Link
          to="/containers"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#697384] hover:text-[#F3F5F7] transition"
        >
          <ArrowLeft size={13} /> Back to Container Inventory
        </Link>
      </div>

      {/* Inspection Header Console */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-[#36D6B4]">
              <ContainerIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-[#F3F5F7] truncate">
                  {containerName}
                </h1>
                <StatusBadge status={container.State?.Status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#697384]">
                <div className="flex items-center gap-1">
                  <span>ID:</span>
                  <span className="text-[#A7B0BE]">{id.slice(0, 12)}</span>
                  <button
                    onClick={() => handleCopy(id, 'id')}
                    title="Copy full ID"
                    className="text-[#697384] hover:text-[#36D6B4] transition"
                  >
                    {copiedText === 'id' ? <Check size={11} className="text-[#36D6B4]" /> : <Copy size={11} />}
                  </button>
                </div>
                <span>&bull;</span>
                <div className="flex items-center gap-1 max-w-sm truncate">
                  <span>Image:</span>
                  <span className="text-[#A7B0BE] truncate" title={container.Config?.Image}>
                    {container.Config?.Image}
                  </span>
                  <button
                    onClick={() => handleCopy(container.Config?.Image, 'image')}
                    title="Copy image name"
                    className="text-[#697384] hover:text-[#36D6B4] transition"
                  >
                    {copiedText === 'image' ? <Check size={11} className="text-[#36D6B4]" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex items-center gap-1 border-t border-white/[0.06] pt-3 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                  isActive
                    ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                    : 'text-[#A7B0BE] hover:bg-white/[0.02] hover:text-[#F3F5F7]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#36D6B4]' : 'text-[#697384]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Metadata */}
          <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
            <h2 className="text-[13px] font-semibold text-[#F3F5F7] border-b border-white/[0.06] pb-2.5 mb-3 font-mono uppercase tracking-wider">
              Runtime Configuration
            </h2>
            <div className="space-y-2.5 font-mono text-[12px]">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Created</span>
                <span className="text-[#F3F5F7]">
                  {new Date(container.Created).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Started At</span>
                <span className="text-[#F3F5F7]">
                  {container.State?.StartedAt ? new Date(container.State.StartedAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Restart Count</span>
                <span className="text-[#F3F5F7]">{container.RestartCount || 0}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Command</span>
                <span className="text-[#A7B0BE] truncate max-w-xs" title={container.Config?.Cmd?.join(' ')}>
                  {container.Config?.Cmd?.join(' ') || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697384]">Working Dir</span>
                <span className="text-[#A7B0BE]">{container.Config?.WorkingDir || '/'}</span>
              </div>
            </div>
          </div>

          {/* Health & Network Summary */}
          <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
            <h2 className="text-[13px] font-semibold text-[#F3F5F7] border-b border-white/[0.06] pb-2.5 mb-3 font-mono uppercase tracking-wider">
              Health & Networking
            </h2>
            <div className="space-y-2.5 font-mono text-[12px]">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Healthcheck Status</span>
                <span className="text-[#36D6B4] font-medium">
                  {container.State?.Health?.Status || 'No healthcheck configured'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Failing Streak</span>
                <span className="text-[#F3F5F7]">
                  {container.State?.Health?.FailingStreak || 0}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">IP Address</span>
                <span className="text-[#36D6B4]">
                  {container.NetworkSettings?.IPAddress || 'Internal bridge'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Gateway</span>
                <span className="text-[#A7B0BE]">
                  {container.NetworkSettings?.Gateway || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697384]">MAC Address</span>
                <span className="text-[#A7B0BE]">
                  {container.NetworkSettings?.MacAddress || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Metrics Telemetry */}
      {activeTab === 'Metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Chart */}
            <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
                <span className="font-mono text-[11px] font-semibold text-[#36D6B4] uppercase tracking-wider">
                  CPU Utilization (%)
                </span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailCpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#36D6B4" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#36D6B4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip content={<ChartTooltip unit="%" />} />
                    <Area type="monotone" dataKey="cpu" name="CPU" stroke="#36D6B4" strokeWidth={1.8} fill="url(#detailCpuGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Memory Chart */}
            <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
                <span className="font-mono text-[11px] font-semibold text-[#6EA8FF] uppercase tracking-wider">
                  Memory Usage (MB)
                </span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailMemGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6EA8FF" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6EA8FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip content={<ChartTooltip unit="MB" />} />
                    <Area type="monotone" dataKey="memoryMb" name="Memory" stroke="#6EA8FF" strokeWidth={1.8} fill="url(#detailMemGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Logs */}
      {activeTab === 'Live Logs' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#0A0E14] overflow-hidden">
          {/* Terminal Toolbar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#11161F] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5C70]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF9B54]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#36D6B4]" />
              </div>
              <span className="ml-2 font-mono text-[11px] text-[#A7B0BE]">
                stdout / stderr stream
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    logStatus === 'connected' ? 'bg-[#36D6B4] animate-pulse-dot' : 'bg-[#FF5C70]'
                  }`}
                />
                <span className="text-[#A7B0BE] capitalize">{logStatus}</span>
              </div>
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`flex items-center gap-1 rounded-md border px-2 py-0.5 transition ${
                  isFollowing
                    ? 'border-[#36D6B4]/30 bg-[#36D6B4]/10 text-[#36D6B4]'
                    : 'border-white/5 text-[#697384] hover:text-[#F3F5F7]'
                }`}
              >
                {isFollowing ? <Pause size={10} /> : <Play size={10} />}
                <span>Auto-follow</span>
              </button>
              <button
                onClick={() => setLogs([])}
                className="rounded-md border border-white/5 p-1 text-[#697384] hover:text-[#F3F5F7] transition"
                title="Clear console"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Terminal Screen */}
          <div className="h-96 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="py-24 text-center text-[#697384]">
                Connecting to Docker stream... Waiting for live container output.
              </div>
            ) : (
              logs.map((l, idx) => (
                <div key={idx} className="flex gap-2.5 hover:bg-white/[0.02] py-0.5 px-1 rounded">
                  <span className="text-[#697384] select-none shrink-0">{l.timestamp}</span>
                  <span
                    className={`font-semibold uppercase select-none shrink-0 ${
                      l.stream === 'stderr' ? 'text-[#FF5C70]' : 'text-[#36D6B4]'
                    }`}
                  >
                    [{l.stream}]
                  </span>
                  <span className={`break-all ${l.stream === 'stderr' ? 'text-[#FF9B54]' : 'text-[#F3F5F7]'}`}>
                    {l.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Tab 4: Environment */}
      {activeTab === 'Environment' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <h2 className="text-[13px] font-semibold text-[#F3F5F7] border-b border-white/[0.06] pb-2.5 mb-3 font-mono uppercase tracking-wider">
            Environment Variables
          </h2>
          <div className="divide-y divide-white/5 font-mono text-[12px]">
            {container.Config?.Env?.map((envStr, idx) => {
              const eqIdx = envStr.indexOf('=')
              const key = eqIdx > -1 ? envStr.slice(0, eqIdx) : envStr
              const val = eqIdx > -1 ? envStr.slice(eqIdx + 1) : ''
              return (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-[#36D6B4] font-medium">{key}</span>
                  <span className="text-[#A7B0BE] truncate max-w-md">{val}</span>
                </div>
              )
            }) || (
              <div className="py-4 text-[#697384]">No custom environment variables defined.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Mounts */}
      {activeTab === 'Mounts' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <h2 className="text-[13px] font-semibold text-[#F3F5F7] border-b border-white/[0.06] pb-2.5 mb-3 font-mono uppercase tracking-wider">
            Volume & Bind Mounts
          </h2>
          <div className="space-y-3">
            {container.Mounts?.map((m, idx) => (
              <div key={idx} className="rounded-lg border border-white/5 bg-[#0D1118] p-3 font-mono text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#36D6B4] uppercase">
                    {m.Type}
                  </span>
                  <span className="text-[#697384] text-[11px]">{m.RW ? 'Read/Write' : 'Read-Only'}</span>
                </div>
                <div className="mt-2 text-[#A7B0BE]">
                  <span className="text-[#697384]">Source:</span> {m.Source}
                </div>
                <div className="mt-1 text-[#F3F5F7]">
                  <span className="text-[#697384]">Destination:</span> {m.Destination}
                </div>
              </div>
            )) || (
              <div className="py-4 text-[#697384]">No volume mounts found.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Networks */}
      {activeTab === 'Networks' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <h2 className="text-[13px] font-semibold text-[#F3F5F7] border-b border-white/[0.06] pb-2.5 mb-3 font-mono uppercase tracking-wider">
            Network Interfaces
          </h2>
          <div className="space-y-3">
            {Object.entries(container.NetworkSettings?.Networks || {}).map(([netName, netData]) => (
              <div key={netName} className="rounded-lg border border-white/5 bg-[#0D1118] p-3 font-mono text-[12px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  <span className="font-semibold text-[#36D6B4]">{netName}</span>
                  <span className="text-[10px] text-[#697384]">{netData.NetworkID?.slice(0, 12)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-[#697384]">IP Address:</span> <span className="text-[#F3F5F7]">{netData.IPAddress || '—'}</span></div>
                  <div><span className="text-[#697384]">Gateway:</span> <span className="text-[#F3F5F7]">{netData.Gateway || '—'}</span></div>
                  <div><span className="text-[#697384]">MAC:</span> <span className="text-[#A7B0BE]">{netData.MacAddress || '—'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
