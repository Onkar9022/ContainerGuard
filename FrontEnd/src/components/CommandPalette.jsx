import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
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
  ArrowRight,
  X,
} from 'lucide-react'
import api from '../services/api'

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [containers, setContainers] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)

      api.get('/api/docker/containers')
        .then((res) => setContainers(res.data || []))
        .catch(() => setContainers([]))
    }
  }, [isOpen])

  // Core navigation commands
  const baseCommands = [
    { id: 'nav-overview', label: 'Overview', category: 'Navigation', icon: LayoutDashboard, path: '/' },
    { id: 'nav-containers', label: 'Containers', category: 'Navigation', icon: Container, path: '/containers' },
    { id: 'nav-metrics', label: 'Telemetry & Metrics', category: 'Navigation', icon: BarChart3, path: '/metrics' },
    { id: 'nav-logs', label: 'Live Logs', category: 'Navigation', icon: ScrollText, path: '/logs' },
    { id: 'nav-images', label: 'Images & Inventory', category: 'Navigation', icon: Box, path: '/images' },
    { id: 'nav-security', label: 'Security & Vulnerabilities', category: 'Security', icon: Shield, path: '/security' },
    { id: 'nav-alerts', label: 'Alert Center', category: 'Security', icon: Bell, path: '/alerts' },
    { id: 'nav-hosts', label: 'Host & Docker Engine', category: 'Infrastructure', icon: Server, path: '/hosts' },
    { id: 'nav-networks', label: 'Network Topology', category: 'Infrastructure', icon: Network, path: '/networks' },
    { id: 'nav-volumes', label: 'Storage Volumes', category: 'Infrastructure', icon: HardDrive, path: '/volumes' },
    { id: 'nav-settings', label: 'System Settings', category: 'Settings', icon: Settings, path: '/settings' },
  ]

  // Container inspection commands
  const containerCommands = containers.map((c) => ({
    id: `container-${c.id}`,
    label: c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12),
    subLabel: `${c.image} • ${c.state}`,
    category: 'Workloads',
    icon: Container,
    path: `/containers/${c.id}`,
  }))

  const allItems = [...baseCommands, ...containerCommands]

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.subLabel && item.subLabel.toLowerCase().includes(q))
    )
  })

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          navigate(filteredItems[selectedIndex].path)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, selectedIndex, navigate, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-white/10 bg-[#11161F] shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-[#0D1118]">
          <Search size={18} className="text-[#A7B0BE]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search containers, telemetry, security, policies..."
            className="flex-1 bg-transparent text-[14px] text-[#F3F5F7] placeholder-[#697384] outline-none"
          />
          <button
            onClick={onClose}
            className="rounded p-1 text-[#697384] hover:text-[#F3F5F7] hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#697384]">
              No matching commands or workloads found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.path)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#1A212C] text-[#36D6B4]'
                      : 'text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-[#36D6B4]/30 bg-[#36D6B4]/10 text-[#36D6B4]'
                          : 'border-white/5 bg-white/5 text-[#A7B0BE]'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-[#F3F5F7]">{item.label}</span>
                      {item.subLabel && (
                        <span className="ml-2 font-mono text-[11px] text-[#697384]">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#697384]">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={13} className="text-[#36D6B4]" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-white/5 bg-[#0D1118] px-4 py-2 text-[11px] text-[#697384]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-[#A7B0BE]">↑</kbd>
              <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-[#A7B0BE]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-[#A7B0BE]">↵</kbd> select
            </span>
            <span>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-[#A7B0BE]">esc</kbd> close
            </span>
          </div>
          <span className="font-mono text-[10px]">ContainerGuard Command Engine</span>
        </div>
      </div>
    </div>
  )
}
