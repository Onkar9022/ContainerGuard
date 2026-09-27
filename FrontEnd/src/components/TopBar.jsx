import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import api from '../services/api'
import avatar from '../assets/Avatar.png'

export default function TopBar() {
  const [health, setHealth] = useState(null)
  const [dockerConnected, setDockerConnected] = useState(false)
  const [openAlertsCount, setOpenAlertsCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      try {
        const [healthRes, dockerRes, alertsRes] = await Promise.allSettled([
          api.get('/api/health'),
          api.get('/api/docker/ping'),
          api.get('/api/alerts/summary'),
        ])

        if (isMounted) {
          if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
          if (dockerRes.status === 'fulfilled') {
            setDockerConnected(dockerRes.value?.success && dockerRes.value?.data === true)
          }
          if (alertsRes.status === 'fulfilled' && alertsRes.value?.data?.open !== undefined) {
            setOpenAlertsCount(alertsRes.value.data.open)
          }
        }
      } catch {
        // Silent background polling
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 15000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const isHealthy = health?.status === 'ok'
  const dbConnected = health?.database === 'connected'

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-border-primary bg-bg-secondary px-5">
      {/* Left side — cluster info */}
      <div className="flex items-center gap-4">
        <span className="text-[13px] font-medium text-text-secondary">
          Cluster / <span className="text-text-primary">local-dev</span>
        </span>
      </div>

      {/* Right side — status + profile */}
      <div className="flex items-center gap-3">
        {/* Environment badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-accent-primary animate-pulse-dot' : 'bg-status-error'}`} />
          <span className="text-[11px] font-medium text-text-secondary">
            {import.meta.env.PROD ? 'Production' : 'Development'}
          </span>
        </div>

        {/* Docker Engine status */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${dockerConnected ? 'bg-accent-primary animate-pulse-dot' : 'bg-status-error'}`} />
          <span className="text-[11px] font-medium text-text-secondary">
            {dockerConnected ? 'Docker Connected' : 'Docker Offline'}
          </span>
        </div>

        {/* Database status */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${dbConnected ? 'bg-accent-primary' : 'bg-status-error'}`} />
          <span className="text-[11px] font-medium text-text-secondary">
            {dbConnected ? 'DB Connected' : 'DB Offline'}
          </span>
        </div>

        {/* Notifications — navigates to Alerts */}
        <button
          onClick={() => navigate('/alerts')}
          title="Open Alert Center"
          className="relative rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
        >
          <Bell size={18} />
          {openAlertsCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-severity-critical text-[9px] font-bold text-white">
              {openAlertsCount}
            </span>
          )}
        </button>

        {/* Operator Avatar */}
        <div className="flex items-center gap-2">
          <img src={avatar} alt="Operator" className="h-8 w-8 rounded-full border border-border-secondary object-cover" />
        </div>
      </div>
    </header>
  )
}
