import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Database, Server, Shield, Bell, Clock } from 'lucide-react'
import api from '../services/api'

export default function Settings() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get('/api/health')
        setHealth(data)
      } catch {
        setHealth(null)
      }
    }
    fetch()
  }, [])

  const sections = [
    {
      icon: Server,
      title: 'API Connection',
      description: 'Backend API server configuration',
      items: [
        { label: 'API URL', value: import.meta.env.VITE_API_URL || 'Not configured' },
        { label: 'Status', value: health?.status === 'ok' ? '✅ Connected' : '❌ Disconnected' },
        { label: 'Version', value: health?.version || '—' },
        { label: 'Uptime', value: health?.uptime ? `${health.uptime}s` : '—' },
      ],
    },
    {
      icon: Database,
      title: 'Database',
      description: 'PostgreSQL connection via Prisma ORM',
      items: [
        { label: 'Provider', value: 'PostgreSQL (NeonDB)' },
        { label: 'Status', value: health?.database === 'connected' ? '✅ Connected' : '❌ Disconnected' },
        { label: 'ORM', value: 'Prisma' },
      ],
    },
    {
      icon: Shield,
      title: 'Security Scanner',
      description: 'Trivy vulnerability scanning engine',
      items: [
        { label: 'Engine', value: 'Trivy' },
        { label: 'Status', value: '⏳ Not configured (Phase 11)' },
        { label: 'Last Scan', value: '—' },
      ],
    },
    {
      icon: Bell,
      title: 'Alert Thresholds',
      description: 'Configurable monitoring thresholds',
      items: [
        { label: 'CPU Threshold', value: '80%' },
        { label: 'Memory Threshold', value: '80%' },
        { label: 'Security Score Minimum', value: '70' },
        { label: 'Status', value: '⏳ Not active (Phase 14)' },
      ],
    },
    {
      icon: Clock,
      title: 'Metrics Collection',
      description: 'Resource monitoring configuration',
      items: [
        { label: 'Collection Interval', value: '15s' },
        { label: 'Retention Period', value: '30 days' },
        { label: 'Status', value: '⏳ Not active (Phase 8)' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          ContainerGuard platform configuration and connection status.
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
