import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import api from '../services/api'
import {
  LayoutDashboard,
  Container,
  BarChart3,
  ScrollText,
  Box,
  Shield,
  Bell,
  Server,
  Network,
  HardDrive,
  Settings,
} from 'lucide-react'
import logo from '../assets/Logo.png'

const navGroups = [
  {
    label: 'OBSERVABILITY',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Overview' },
      { to: '/containers', icon: Container, label: 'Containers' },
      { to: '/metrics', icon: BarChart3, label: 'Metrics' },
      { to: '/logs', icon: ScrollText, label: 'Live Logs' },
    ],
  },
  {
    label: 'DEVSECOPS & SUPPLY CHAIN',
    items: [
      { to: '/images', icon: Box, label: 'Images' },
      { to: '/security', icon: Shield, label: 'Security' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
    ],
  },
  {
    label: 'INFRASTRUCTURE',
    items: [
      { to: '/hosts', icon: Server, label: 'Hosts' },
      { to: '/networks', icon: Network, label: 'Networks' },
      { to: '/volumes', icon: HardDrive, label: 'Volumes' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const [openAlertsCount, setOpenAlertsCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    async function fetchAlertCount() {
      try {
        const res = await api.get('/api/alerts/summary')
        if (isMounted && res?.data?.open !== undefined) {
          setOpenAlertsCount(res.data.open)
        }
      } catch {
        // Silent fail for sidebar badge
      }
    }
    fetchAlertCount()
    const timer = setInterval(fetchAlertCount, 15000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <aside className="flex w-[230px] min-w-[230px] flex-col border-r border-border-primary bg-sidebar-bg">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <img src={logo} alt="ContainerGuard" className="h-7 w-7" />
        <span className="text-[15px] font-bold text-text-primary tracking-tight">
          ContainerGuard
        </span>
        <span className="ml-1 rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-primary">
          v2.4
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-sidebar-active text-accent-primary'
                          : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={16} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </div>

                    {item.to === '/alerts' && openAlertsCount > 0 && (
                      <span className="rounded-full bg-severity-critical px-1.5 py-0.2 text-[10px] font-bold text-white leading-none">
                        {openAlertsCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
