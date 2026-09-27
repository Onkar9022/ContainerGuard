import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Shield,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  HardDrive,
  CheckCircle2,
  Server,
  Zap,
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
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import ChartTooltip from '../components/ChartTooltip'
import ProgressBar from '../components/ProgressBar'
import api from '../services/api'

export default function Overview() {
  const [health, setHealth] = useState(null)
  const [containers, setContainers] = useState([])
  const [dockerInfo, setDockerInfo] = useState(null)
  const [policySummary, setPolicySummary] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [alertsSummary, setAlertsSummary] = useState(null)
  const [liveMetrics, setLiveMetrics] = useState([])
  const [metricHistory, setMetricHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      try {
        const [
          healthRes,
          containersRes,
          infoRes,
          policyRes,
          scansRes,
          alertsRes,
          metricsRes,
        ] = await Promise.allSettled([
          api.get('/api/health'),
          api.get('/api/docker/containers'),
          api.get('/api/docker/info'),
          api.get('/api/security/policies/summary'),
          api.get('/api/security/scans?limit=5'),
          api.get('/api/alerts/summary'),
          api.get('/api/metrics'),
        ])

        if (isMounted) {
          if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
          
          let containerList = []
          if (containersRes.status === 'fulfilled') {
            containerList = containersRes.value?.data || []
            setContainers(containerList)
          }

          if (infoRes.status === 'fulfilled') setDockerInfo(infoRes.value?.data || null)
          if (policyRes.status === 'fulfilled') setPolicySummary(policyRes.value?.data || null)
          if (scansRes.status === 'fulfilled') setRecentScans(scansRes.value?.data || [])
          if (alertsRes.status === 'fulfilled') setAlertsSummary(alertsRes.value?.data || null)
          if (metricsRes.status === 'fulfilled') setLiveMetrics(metricsRes.value?.data || [])

          // Fetch historical trend if a running container exists
          const runningContainer = containerList.find((c) => c.state === 'running') || containerList[0]
          if (runningContainer) {
            try {
              const histRes = await api.get(`/api/metrics/${runningContainer.id}/history?limit=12`)
              const data = histRes.data || []
              const formatted = data.slice().reverse().map((m) => {
                const d = new Date(m.timestamp)
                return {
                  time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
                  cpu: Number((m.cpuPercent || 0).toFixed(1)),
                  memory: Number(((m.memoryUsage || 0) / (1024 * 1024)).toFixed(1)),
                  netRx: Number(((m.networkRxBytes || 0) / (1024 * 1024)).toFixed(2)),
                  netTx: Number(((m.networkTxBytes || 0) / (1024 * 1024)).toFixed(2)),
                }
              })
              setMetricHistory(formatted)
            } catch {
              // History fallback
            }
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    const timer = setInterval(loadDashboardData, 10000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  const running = containers.filter((c) => c.state === 'running').length
  const stopped = containers.filter((c) => c.state !== 'running').length
  const total = containers.length

  const latestScan = recentScans[0] || null

  // Map metrics by container ID
  const metricsMap = new Map()
  for (const m of liveMetrics) {
    if (m.containerId) metricsMap.set(m.containerId, m)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Overview</h1>
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-mono text-[#A7B0BE]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  health?.status === 'ok'
                    ? 'bg-[#36D6B4] shadow-[0_0_6px_#36D6B4]'
                    : 'bg-[#FF5C70]'
                }`}
              />
              {health?.status === 'ok' ? 'API Synchronized' : 'API Offline'}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Live overview of container workloads, resource utilization, security posture, and system health.
          </p>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Running Containers */}
        <StatCard
          icon={Container}
          label="RUNNING CONTAINERS"
          value={`${running} / ${total}`}
          subValue={
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-[#36D6B4]">● {running} Healthy</span>
              <span className="text-[#697384]">● {stopped} Inactive</span>
            </div>
          }
          badge={total > 0 && running === total ? 'ALL HEALTHY' : `${stopped} STOPPED`}
          badgeType={running === total && total > 0 ? 'teal' : 'neutral'}
          onClick={() => navigate('/containers')}
        />

        {/* Security Score */}
        <StatCard
          icon={Shield}
          label="POLICY SECURITY SCORE"
          value={
            policySummary?.averageScore !== undefined
              ? `${policySummary.averageScore}/100`
              : '—'
          }
          subValue={
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#35D399]">
                ✓ {policySummary?.compliantContainers ?? 0} Compliant
              </span>
              <span className="text-[#697384]">|</span>
              <span className="text-[#FF5C70]">
                ✗ {policySummary?.nonCompliantContainers ?? 0} Violating
              </span>
            </div>
          }
          badge={policySummary?.averageScore >= 80 ? 'COMPLIANT' : 'NEEDS ATTENTION'}
          badgeType={policySummary?.averageScore >= 80 ? 'teal' : 'warning'}
          onClick={() => navigate('/security')}
        />

        {/* Vulnerabilities */}
        <StatCard
          icon={AlertTriangle}
          label="VULNERABILITIES (TRIVY)"
          value={
            latestScan ? (
              <span className="text-[#F3F5F7]">
                {latestScan.totalVulnerabilities} <span className="text-sm font-normal text-[#697384]">Total</span>
              </span>
            ) : (
              '0'
            )
          }
          subValue={
            latestScan ? (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-[#FF5C70]">● {latestScan.criticalCount} Crit</span>
                <span className="text-[#FF9B54]">● {latestScan.highCount} High</span>
                <span className="text-[#F2C94C]">● {latestScan.mediumCount} Med</span>
              </div>
            ) : (
              <span className="font-mono text-[11px] text-[#697384]">No active image scans</span>
            )
          }
          badge={latestScan?.criticalCount > 0 ? `${latestScan.criticalCount} CRITICAL` : 'CLEAR'}
          badgeType={latestScan?.criticalCount > 0 ? 'critical' : 'teal'}
          onClick={() => navigate('/security')}
        />

        {/* Open Alerts */}
        <StatCard
          icon={Activity}
          label="OPEN ALERTS"
          value={alertsSummary?.open ?? 0}
          subValue={
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#FF5C70]">● {alertsSummary?.critical ?? 0} Crit</span>
              <span className="text-[#FF9B54]">● {alertsSummary?.warning ?? 0} Warn</span>
              <span className="text-[#697384]">● {alertsSummary?.resolved ?? 0} Resolved</span>
            </div>
          }
          badge={alertsSummary?.open > 0 ? `${alertsSummary.open} ACTIVE` : 'ALL RESOLVED'}
          badgeType={alertsSummary?.open > 0 ? 'critical' : 'teal'}
          onClick={() => navigate('/alerts')}
        />
      </div>

      {/* Resource Usage & Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: CPU / Memory Telemetry Chart */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-[#36D6B4]" />
              <h2 className="text-[14px] font-semibold text-[#F3F5F7]">Workload Telemetry</h2>
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#697384]">
                CPU % &bull; MEM MB
              </span>
            </div>
            <button
              onClick={() => navigate('/metrics')}
              className="flex items-center gap-1 text-[11px] font-medium text-[#36D6B4] hover:underline"
            >
              Telemetry Center <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="h-60 w-full">
            {metricHistory.length === 0 ? (
              <div className="flex h-full items-center justify-center font-mono text-[12px] text-[#697384]">
                Awaiting continuous telemetry from Docker Engine metrics worker...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#36D6B4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#36D6B4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6EA8FF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6EA8FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip unit="" />} />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#36D6B4"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    name="Memory MB"
                    stroke="#6EA8FF"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#memGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: System & Infrastructure Health */}
        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Server size={15} className="text-[#36D6B4]" />
                <h2 className="text-[14px] font-semibold text-[#F3F5F7]">Engine & Runtime</h2>
              </div>
              <span className="font-mono text-[10px] text-[#36D6B4]">HEALTHY</span>
            </div>

            <div className="space-y-3 font-mono text-[12px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Docker Host OS</span>
                <span className="text-[#F3F5F7] font-medium">{dockerInfo?.osType || 'Linux'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Docker Version</span>
                <span className="text-[#A7B0BE]">{dockerInfo?.dockerVersion || '27.x'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">CPU Cores</span>
                <span className="text-[#F3F5F7]">{dockerInfo?.cpus ?? 2} Cores</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#697384]">Memory Allocation</span>
                <span className="text-[#F3F5F7]">
                  {dockerInfo?.totalMemory
                    ? `${(dockerInfo.totalMemory / (1024 ** 3)).toFixed(1)} GB`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#697384]">Reverse Proxy</span>
                <span className="text-[#36D6B4]">Nginx :8080 Active</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#697384]">
            <span>Uptime: {health?.uptime ? `${Math.floor(health.uptime / 60)} mins` : '—'}</span>
            <button
              onClick={() => navigate('/hosts')}
              className="text-[#36D6B4] hover:underline"
            >
              Host details &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Active Container Fleet Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 bg-[#0D1118]">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold text-[#F3F5F7]">Active Container Fleet</h2>
            <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-[#A7B0BE] border border-white/5">
              {total} units
            </span>
          </div>
          <button
            onClick={() => navigate('/containers')}
            className="text-[11px] font-medium text-[#36D6B4] hover:underline flex items-center gap-1"
          >
            Manage Containers <ArrowUpRight size={12} />
          </button>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-[1.2fr_90px_1.2fr_120px_100px] gap-3 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06]">
          <span>Container</span>
          <span>Status</span>
          <span>Image</span>
          <span>CPU / Memory</span>
          <span>Ports</span>
        </div>

        {/* Container Rows */}
        <div className="divide-y divide-white/[0.04]">
          {containers.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#697384]">
              No active Docker containers detected.
            </div>
          ) : (
            containers.slice(0, 6).map((c) => {
              const metric = metricsMap.get(c.id)
              const containerName = c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12)
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/containers/${c.id}`)}
                  className="grid grid-cols-[1.2fr_90px_1.2fr_120px_100px] gap-3 items-center px-5 py-3 text-[12px] cursor-pointer hover:bg-[#151B24] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F3F5F7] truncate">{containerName}</p>
                    <p className="font-mono text-[10px] text-[#697384] truncate">{c.id.slice(0, 12)}</p>
                  </div>

                  <div>
                    <StatusBadge status={c.state} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-[#A7B0BE] truncate" title={c.image}>
                      {c.image}
                    </p>
                  </div>

                  <div className="min-w-0">
                    {metric ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#A7B0BE]">
                          <span>{metric.cpuPercent?.toFixed(1) || '0'}%</span>
                          <span>{((metric.memoryUsage || 0) / (1024 * 1024)).toFixed(0)} MB</span>
                        </div>
                        <ProgressBar value={metric.cpuPercent || 0} max={100} size="xs" color="teal" />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#697384]">Telemetry idle</span>
                    )}
                  </div>

                  <div className="min-w-0 font-mono text-[11px] text-[#697384] truncate">
                    {c.ports?.filter((p) => p.PublicPort).map((p) => `${p.PublicPort}→${p.PrivatePort}`).join(', ') || 'Internal'}
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
