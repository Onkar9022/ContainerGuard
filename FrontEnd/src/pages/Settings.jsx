import { useState, useEffect } from 'react'
import {
  Server,
  Database,
  Container,
  Shield,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react'
import api from '../services/api'

export default function Settings() {
  const [health, setHealth] = useState(null)
  const [dockerInfo, setDockerInfo] = useState(null)
  const [dockerConnected, setDockerConnected] = useState(false)
  const [trivyStatus, setTrivyStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAllSettings = async () => {
    try {
      const [healthRes, dockerRes, trivyRes] = await Promise.allSettled([
        api.get('/api/health'),
        api.get('/api/docker/info'),
        api.get('/api/security/trivy-status'),
      ])

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
      if (dockerRes.status === 'fulfilled') {
        setDockerInfo(dockerRes.value?.data || null)
        setDockerConnected(true)
      }
      if (trivyRes.status === 'fulfilled') {
        setTrivyStatus(trivyRes.value?.data || null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllSettings()
  }, [])

  const sections = [
    {
      icon: Server,
      title: 'API Gateway & Reverse Proxy',
      description: 'Production entrypoint routing, Nginx unified proxy, and HTTP REST interface',
      status: health?.status === 'ok' ? 'HEALTHY' : 'OFFLINE',
      statusColor: health?.status === 'ok' ? 'teal' : 'critical',
      items: [
        { label: 'Gateway Mode', value: import.meta.env.PROD ? 'Nginx Unified Gateway (:8080)' : 'Vite Dev Proxy (:5000)' },
        { label: 'Base API Endpoint', value: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'Same-origin (/api)' : 'http://localhost:5000') },
        { label: 'Environment Mode', value: health?.environment || (import.meta.env.PROD ? 'production' : 'development') },
        { label: 'Service Uptime', value: health?.uptime ? `${Math.floor(health.uptime / 60)} minutes` : '—' },
      ],
    },
    {
      icon: Database,
      title: 'PostgreSQL Database & Prisma ORM',
      description: 'Relational telemetry persistence, scan archives, and deduplicated alert registry',
      status: health?.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
      statusColor: health?.database === 'connected' ? 'teal' : 'critical',
      items: [
        { label: 'Database Engine', value: 'PostgreSQL 16 (Alpine)' },
        { label: 'Connection Status', value: health?.database === 'connected' ? 'Active pool verified' : 'Unreachable' },
        { label: 'ORM Engine', value: 'Prisma Client 6.9' },
        { label: 'Internal Host', value: 'postgres:5432 (Isolated Docker Network)' },
      ],
    },
    {
      icon: Container,
      title: 'Docker Engine Socket Integration',
      description: 'Host Docker daemon communication via mounted UNIX socket (/var/run/docker.sock)',
      status: dockerConnected ? 'CONNECTED' : 'OFFLINE',
      statusColor: dockerConnected ? 'teal' : 'critical',
      items: [
        { label: 'UNIX Socket Status', value: dockerConnected ? 'Mounted & Operational' : 'Socket Unavailable' },
        { label: 'Docker Daemon Version', value: dockerInfo?.dockerVersion || '—' },
        { label: 'API Version', value: dockerInfo?.apiVersion || '—' },
        { label: 'Storage Driver', value: dockerInfo?.storageDriver || 'overlay2' },
      ],
    },
    {
      icon: Shield,
      title: 'Trivy Security Scanner',
      description: 'Aqua Security Trivy CLI container vulnerability scanner integration',
      status: trivyStatus?.installed ? 'ACTIVE' : 'OFFLINE',
      statusColor: trivyStatus?.installed ? 'teal' : 'critical',
      items: [
        { label: 'Scanner Engine', value: 'Aqua Security Trivy CLI' },
        { label: 'Execution Mode', value: 'Local On-Demand CLI Subprocess' },
        { label: 'Scanner Status', value: trivyStatus?.installed ? `Installed (${trivyStatus.version || 'Ready'})` : 'Binary not found in PATH' },
        { label: 'Database Vulnerabilities', value: 'Auto-updated Aqua Trivy DB' },
      ],
    },
    {
      icon: Bell,
      title: 'Alerting & Policy Rule Engine',
      description: 'Background workers evaluating CG001–CG006 policies and cgroup utilization thresholds',
      status: 'ACTIVE',
      statusColor: 'teal',
      items: [
        { label: 'Evaluation Cycle', value: 'Every 10,000ms (10 seconds)' },
        { label: 'CPU Alert Threshold', value: '80% utilization sustained' },
        { label: 'Memory Alert Threshold', value: '80% cgroup limit sustained' },
        { label: 'Policy Score Minimum', value: '70 / 100 threshold' },
      ],
    },
    {
      icon: Clock,
      title: 'Metrics Telemetry Aggregator',
      description: 'Continuous container resource sampling and batch writing to database',
      status: 'ACTIVE',
      statusColor: 'teal',
      items: [
        { label: 'Collection Frequency', value: 'Every 5,000ms (5 seconds)' },
        { label: 'Batch Ingestion', value: 'Bulk insert via Prisma createMany' },
        { label: 'Telemetry Metrics', value: 'CPU %, Memory MB, Network Rx/Tx, Disk I/O' },
        { label: 'Log Stream Engine', value: 'Socket.IO multiplexed Docker modem' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">System Configuration</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              Runtime Topology
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Architectural subsystems, database connection pool, Docker daemon integration, and security scanner parameters.
          </p>
        </div>

        <button
          onClick={fetchAllSettings}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Verify Subsystems
        </button>
      </div>

      {/* Configuration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec) => {
          const Icon = sec.icon
          const isTeal = sec.statusColor === 'teal'

          return (
            <div
              key={sec.title}
              className="rounded-xl border border-white/[0.07] bg-[#11161F] p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-[#36D6B4]">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#F3F5F7] text-[13px]">{sec.title}</h2>
                      <p className="text-[11px] text-[#697384] mt-0.5">{sec.description}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                      isTeal
                        ? 'border-[#36D6B4]/30 bg-[#36D6B4]/10 text-[#36D6B4]'
                        : 'border-[#FF5C70]/30 bg-[#FF5C70]/10 text-[#FF5C70]'
                    }`}
                  >
                    {sec.status}
                  </span>
                </div>

                <div className="space-y-2.5 font-mono text-[12px]">
                  {sec.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                      <span className="text-[#697384] text-[11px]">{item.label}</span>
                      <span className="font-medium text-[#F3F5F7] text-right truncate max-w-xs">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
