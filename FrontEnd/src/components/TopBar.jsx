import { useState, useEffect } from 'react'
import { Search, Bell, ChevronDown } from 'lucide-react'
import api from '../services/api'
import avatar from '../assets/Avatar.png'

export default function TopBar() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await api.get('/api/health')
        setHealth(data)
      } catch {
        setHealth(null)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
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

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Press ⌘K to search containers, CVEs, images..."
            className="h-8 w-80 rounded-lg border border-border-primary bg-bg-tertiary pl-8 pr-3 text-[12px] text-text-primary placeholder-text-muted outline-none transition focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20"
          />
        </div>
      </div>

      {/* Right side — status + profile */}
      <div className="flex items-center gap-3">
        {/* Environment badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-accent-primary animate-pulse-dot' : 'bg-status-error'}`} />
          <span className="text-[11px] font-medium text-text-secondary">
            Development
          </span>
          <ChevronDown size={12} className="text-text-muted" />
        </div>

        {/* Docker Engine status */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-text-muted" />
          <span className="text-[11px] font-medium text-text-secondary">
            Docker Engine
          </span>
          <span className="text-[11px] text-text-muted">(Phase 4)</span>
        </div>

        {/* Database status */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${dbConnected ? 'bg-accent-primary' : 'bg-status-error'}`} />
          <span className="text-[11px] font-medium text-text-secondary">
            {dbConnected ? 'DB Connected' : 'DB Offline'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary">
          <Bell size={18} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-severity-critical text-[9px] font-bold text-white">
            3
          </span>
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <img src={avatar} alt="User" className="h-8 w-8 rounded-full border border-border-secondary object-cover" />
          <ChevronDown size={12} className="text-text-muted" />
        </div>
      </div>
    </header>
  )
}
