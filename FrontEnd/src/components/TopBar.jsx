import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Menu, Server, Database, ShieldAlert } from 'lucide-react'
import api from '../services/api'

export default function TopBar({ onOpenMobileNav, onOpenCommandPalette }) {
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
        // Silent polling
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 15000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const isProd = import.meta.env.PROD || health?.environment === 'production'
  const isHealthy = health?.status === 'ok'
  const dbConnected = health?.database === 'connected'

  return (
    <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0A0E14]/80 px-4 backdrop-blur-md">
      {/* Left: Mobile Nav Toggle & Environment Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 text-[#A7B0BE] hover:bg-white/5 hover:text-[#F3F5F7] md:hidden transition"
          title="Open Navigation"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#697384]">Environment</span>
          <span className="text-[#697384]">/</span>
          <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isHealthy ? 'bg-[#36D6B4] shadow-[0_0_6px_#36D6B4]' : 'bg-[#FF5C70]'
              }`}
            />
            <span className="font-mono text-[11px] font-semibold text-[#F3F5F7]">
              {isProd ? 'production-cluster' : 'development-stack'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Command Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.07] bg-[#11161F]/90 px-3 py-1.5 text-[12px] text-[#697384] hover:border-white/[0.14] hover:bg-[#151B24] hover:text-[#A7B0BE] transition-all shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#697384]" />
            <span className="truncate">Search containers, metrics, security, logs...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#A7B0BE]">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Operational Status Badges & Alerts */}
      <div className="flex items-center gap-2.5">
        {/* Docker Engine status */}
        <div
          title={dockerConnected ? 'Docker socket connected' : 'Docker socket offline'}
          className="hidden lg:flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-[#11161F] px-2.5 py-1 text-[11px]"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              dockerConnected ? 'bg-[#36D6B4] animate-pulse-dot shadow-[0_0_6px_#36D6B4]' : 'bg-[#FF5C70]'
            }`}
          />
          <span className="font-mono text-[11px] text-[#A7B0BE]">
            {dockerConnected ? 'Docker Active' : 'Docker Offline'}
          </span>
        </div>

        {/* Database status */}
        <div
          title={dbConnected ? 'PostgreSQL database connected' : 'Database disconnected'}
          className="hidden xl:flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-[#11161F] px-2.5 py-1 text-[11px]"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              dbConnected ? 'bg-[#36D6B4]' : 'bg-[#FF5C70]'
            }`}
          />
          <span className="font-mono text-[11px] text-[#A7B0BE]">
            {dbConnected ? 'Postgres 16' : 'DB Offline'}
          </span>
        </div>

        {/* Alert Notifications Button */}
        <button
          onClick={() => navigate('/alerts')}
          title="Open Alert Center"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#11161F] text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <Bell size={15} />
          {openAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5C70] font-mono text-[9px] font-bold text-white shadow-[0_0_8px_rgba(255,92,112,0.4)]">
              {openAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
