import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Container,
  BarChart3,
  ScrollText,
  Box,
  Shield,
  Bell,
  Rocket,
  Server,
  Network,
  HardDrive,
  Activity,
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
      { to: '/logs', icon: ScrollText, label: 'Logs' },
    ],
  },
  {
    label: 'DEVSECOPS & SUPPLY CHAIN',
    items: [
      { to: '/images', icon: Box, label: 'Images' },
      { to: '/security', icon: Shield, label: 'Security' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/deployments', icon: Rocket, label: 'Deployments' },
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
      { to: '/activity', icon: Activity, label: 'Activity' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
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
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-sidebar-active text-accent-primary'
                          : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
                      }`
                    }
                  >
                    <item.icon size={16} strokeWidth={1.8} />
                    {item.label}
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
