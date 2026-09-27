import { useState, useEffect } from 'react'
import { Database, Server, Shield, Bell, Clock, Container } from 'lucide-react'
import api from '../services/api'

export default function Settings() {
  const [health, setHealth] = useState(null)
  const [dockerInfo, setDockerInfo] = useState(null)
  const [dockerConnected, setDockerConnected] = useState(false)
  const [trivyStatus, setTrivyStatus] = useState(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.get('/api/health')
        setHealth(data)
      } catch {
        setHealth(null)
      }
    }
    const fetchDocker = async () => {
      try {
        const res = await api.get('/api/docker/info')
        setDockerInfo(res.data)
        setDockerConnected(true)
      } catch {
        setDockerInfo(null)
        setDockerConnected(false)
      }
    }
    const fetchTrivy = async () => {
      try {
        const res = await api.get('/api/security/trivy-status')
        setTrivyStatus(res.data)
      } catch {
        setTrivyStatus(null)
      }
    }
    fetchHealth()
    fetchDocker()
    fetchTrivy()
  }, [])

  const sections = [
    {
      icon: Server,
      title: 'API Gateway & Reverse Proxy',
      description: 'Production gateway entrypoint and backend API configuration',
      items: [
        { label: 'API Base URL', value: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'Same-origin (/api)' : 'http://localhost:5000') },
        { label: 'Status', value: health?.status === 'ok' ? '✅ Connected' : '❌ Disconnected' },
        { label: 'Version', value: health?.version || '1.0.0' },
        { label: 'Service Uptime', value: health?.uptime ? `${health.uptime}s` : '—' },
      ],
    },
    {
      icon: Database,
      title: 'Database',
      description: 'PostgreSQL connection via Prisma ORM',
      items: [
        { label: 'Engine', value: 'PostgreSQL 16' },
        { label: 'Connection Status', value: health?.database === 'connected' ? '✅ Connected' : '❌ Disconnected' },
        { label: 'ORM', value: 'Prisma Client' },
      ],
    },
    {
      icon: Container,
      title: 'Docker Engine',
      description: 'Docker Engine integration via host socket',
      items: [
        { label: 'Socket Status', value: dockerConnected ? '✅ Connected' : '❌ Disconnected' },
        { label: 'Docker Version', value: dockerInfo?.dockerVersion || '—' },
        { label: 'API Version', value: dockerInfo?.apiVersion || '—' },
        { label: 'Total Containers', value: dockerInfo?.containersTotal ?? '—' },
        { label: 'Total Images', value: dockerInfo?.imagesTotal ?? '—' },
      ],
    },
    {
      icon: Shield,
      title: 'Security Scanner',
      description: 'Trivy vulnerability scanner integration',
      items: [
        { label: 'Engine', value: 'Aqua Security Trivy CLI' },
        { label: 'Status', value: trivyStatus?.installed ? `✅ Installed (${trivyStatus.version || 'active'})` : '❌ Not Available' },
        { label: 'Scan Mode', value: 'On-Demand Container Image Inspection' },
      ],
    },
    {
      icon: Bell,
      title: 'Alert System',
      description: 'Active monitoring rules and notification thresholds',
      items: [
        { label: 'CPU Alert Threshold', value: '80%' },
        { label: 'Memory Alert Threshold', value: '80%' },
        { label: 'Policy Score Minimum', value: '70 / 100' },
        { label: 'Status', value: '✅ Active (AL001–AL006 rules evaluated every 10s)' },
      ],
    },
    {
      icon: Clock,
      title: 'Metrics Telemetry',
      description: 'Continuous resource monitoring and persistence',
      items: [
        { label: 'Collection Frequency', value: 'Every 5s' },
        { label: 'Persistence Target', value: 'PostgreSQL (container_metrics)' },
        { label: 'Status', value: '✅ Active (Worker Running)' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          ContainerGuard platform configuration, subsystem health, and runtime telemetry.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border-primary px-5 py-3">
              <section.icon size={16} className="text-accent-primary" />
              <div>
                <h3 className="text-[13px] font-semibold text-text-primary">{section.title}</h3>
                <p className="text-[11px] text-text-muted">{section.description}</p>
              </div>
            </div>
            <div className="px-5 py-3">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border-primary py-2.5 last:border-0">
                  <span className="text-[12px] text-text-secondary">{item.label}</span>
                  <span className="font-mono text-[12px] text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
