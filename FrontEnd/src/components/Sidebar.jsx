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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

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
    label: 'SECURITY & SUPPLY CHAIN',
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

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
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
        // Silent fail
      }
    }
    fetchAlertCount()
    const timer = setInterval(fetchAlertCount, 15000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0A0E15] text-[#A7B0BE] select-none">
      {/* Brand Header */}
      <div className="flex h-[56px] items-center justify-between border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#36D6B4]/30 bg-[#36D6B4]/10 text-[#36D6B4] shadow-[0_0_12px_rgba(54,214,180,0.15)]">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-bold text-[#F3F5F7] tracking-tight">
                  ContainerGuard
                </span>
                <span className="rounded border border-[#36D6B4]/20 bg-[#36D6B4]/10 px-1 py-0.2 text-[9px] font-mono font-semibold text-[#36D6B4]">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] text-[#697384] truncate">
                Container Security Platform
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-white/5 text-[#697384] hover:bg-white/5 hover:text-[#F3F5F7] transition"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#697384]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile()
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center ${
                        isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
                      } h-9 rounded-lg text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#151B24] text-[#36D6B4] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                          : 'text-[#A7B0BE] hover:bg-[#11161F] hover:text-[#F3F5F7]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active Indicator Bar on the left */}
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#36D6B4] shadow-[0_0_8px_#36D6B4]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            size={16}
                            strokeWidth={isActive ? 2 : 1.8}
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-[#36D6B4]' : 'text-[#697384] group-hover:text-[#A7B0BE]'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {/* Open Alert Badge */}
                        {item.to === '/alerts' && openAlertsCount > 0 && (
                          <span
                            className={`${
                              isCollapsed
                                ? 'absolute -top-1 -right-1 flex h-4 w-4'
                                : 'flex px-1.5 py-0.2'
                            } items-center justify-center rounded-full bg-[#FF5C70] text-[9px] font-mono font-bold text-white shadow-[0_0_8px_rgba(255,92,112,0.4)] leading-none`}
                          >
                            {openAlertsCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer System Telemetry Indicator */}
      <div className="border-t border-white/[0.07] p-3 bg-[#080B10]">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36D6B4] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#36D6B4]" />
            </span>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-[#F3F5F7]">Engine Active</span>
                <span className="font-mono text-[9px] text-[#697384]">Docker &bull; ap-south-1</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block shrink-0 border-r border-white/[0.07] transition-all duration-200 ease-out z-20 ${
          isCollapsed ? 'w-[64px]' : 'w-[230px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[240px] transform bg-[#0A0E15] transition-transform duration-200 ease-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}
