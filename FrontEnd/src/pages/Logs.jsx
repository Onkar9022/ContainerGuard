import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import {
  Terminal as TerminalIcon,
  Search,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Download,
  Filter,
} from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Logs() {
  const [containers, setContainers] = useState([])
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [logs, setLogs] = useState([])
  const [logStatus, setLogStatus] = useState('idle') // idle, connecting, connected, error, disconnected
  const [search, setSearch] = useState('')
  const [isFollowing, setIsFollowing] = useState(true)
  const [copied, setCopied] = useState(false)

  const socketRef = useRef(null)
  const logsEndRef = useRef(null)

  // 1. Fetch available containers
  useEffect(() => {
    async function loadContainers() {
      try {
        const res = await api.get('/api/docker/containers')
        const list = res.data || []
        setContainers(list)
        if (list.length > 0 && !selectedContainerId) {
          const firstRunning = list.find((c) => c.state === 'running') || list[0]
          setSelectedContainerId(firstRunning.id)
        }
      } catch {
        setContainers([])
      }
    }
    loadContainers()
  }, [])

  // 2. Manage Socket.IO connection
  useEffect(() => {
    if (!selectedContainerId) return

    if (socketRef.current) {
      socketRef.current.emit('logs:stop')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setLogs([])
    setLogStatus('connecting')

    const backendUrl = import.meta.env.VITE_API_URL !== undefined
      ? import.meta.env.VITE_API_URL
      : (import.meta.env.PROD ? undefined : 'http://localhost:5000')

    const socket = io(backendUrl || undefined, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setLogStatus('connected')
      socket.emit('logs:start', { containerId: selectedContainerId })
    })

    socket.on('logs:status', ({ status }) => setLogStatus(status))
    socket.on('logs:error', () => setLogStatus('error'))

    socket.on('logs:data', (logEntry) => {
      setLogs((prev) => [...prev.slice(-999), logEntry])
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('logs:stop')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [selectedContainerId])

  // 3. Auto-scroll
  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isFollowing])

  const filteredLogs = logs.filter((l) =>
    !search || l.message.toLowerCase().includes(search.toLowerCase())
  )

  const handleCopyLogs = () => {
    const raw = filteredLogs.map((l) => `[${l.timestamp}] [${l.stream}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const selectedContainer = containers.find((c) => c.id === selectedContainerId)
  const containerName = selectedContainer?.names?.[0]?.replace(/^\//, '') || selectedContainerId.slice(0, 12)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Live Stream Terminal</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              Demuxed Socket.IO
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Real-time stdout/stderr log streaming directly from Docker Engine daemon.
          </p>
        </div>

        {/* Workload Target Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedContainerId}
            onChange={(e) => setSelectedContainerId(e.target.value)}
            className="h-9 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 font-mono text-[12px] text-[#F3F5F7] outline-none transition focus:border-[#36D6B4]/50 focus:bg-[#151B24]"
          >
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12)} ({c.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Terminal Workstation Frame */}
      <div className="rounded-xl border border-white/[0.07] bg-[#070A0F] shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[500px]">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0D1118] px-4 py-2.5">
          <div className="flex items-center gap-3">
            {/* Terminal Window Dots */}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5C70]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF9B54]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#36D6B4]/70" />
            </div>

            <span className="font-mono text-[11px] text-[#697384]">
              containerguard &bull; <span className="text-[#A7B0BE]">{containerName}</span> &bull; logs
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#697384]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter output..."
                className="h-7 w-44 rounded-md border border-white/5 bg-[#151B24] pl-7 pr-2 font-mono text-[11px] text-[#F3F5F7] placeholder-[#697384] outline-none focus:border-[#36D6B4]/40"
              />
            </div>

            {/* Connection Status Pill */}
            <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 font-mono text-[10px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  logStatus === 'connected' ? 'bg-[#36D6B4] animate-pulse-dot shadow-[0_0_6px_#36D6B4]' : 'bg-[#FF5C70]'
                }`}
              />
              <span className="text-[#A7B0BE] capitalize">{logStatus}</span>
            </div>

            {/* Auto-Follow Toggle */}
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                isFollowing
                  ? 'border-[#36D6B4]/30 bg-[#36D6B4]/10 text-[#36D6B4]'
                  : 'border-white/5 text-[#697384] hover:text-[#F3F5F7]'
              }`}
            >
              {isFollowing ? <Pause size={10} /> : <Play size={10} />}
              <span>{isFollowing ? 'Following' : 'Paused'}</span>
            </button>

            {/* Copy Logs */}
            <button
              onClick={handleCopyLogs}
              title="Copy visible output"
              className="flex items-center gap-1 rounded-md border border-white/5 px-2 py-1 font-mono text-[10px] text-[#A7B0BE] hover:bg-white/5 hover:text-[#F3F5F7] transition"
            >
              {copied ? <Check size={11} className="text-[#36D6B4]" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Clear Logs */}
            <button
              onClick={() => setLogs([])}
              title="Clear terminal buffer"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/5 text-[#697384] hover:bg-white/5 hover:text-[#FF5C70] transition"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed select-text space-y-0.5">
          {filteredLogs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center font-mono text-[12px] text-[#697384]">
              <TerminalIcon size={32} className="mb-2 text-[#697384]/40" />
              <span>
                {logStatus === 'connected'
                  ? 'Listening to Docker log stream... Waiting for container output.'
                  : 'Waiting for stream connection...'}
              </span>
            </div>
          ) : (
            filteredLogs.map((l, idx) => (
              <div
                key={idx}
                className="group flex gap-3 hover:bg-white/[0.03] px-2 py-0.5 rounded transition-colors"
              >
                <span className="font-mono text-[#697384] select-none shrink-0 text-[10px] pt-0.5">
                  {l.timestamp}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase select-none shrink-0 pt-0.5 ${
                    l.stream === 'stderr' ? 'text-[#FF5C70]' : 'text-[#36D6B4]'
                  }`}
                >
                  [{l.stream}]
                </span>
                <span
                  className={`break-all ${
                    l.stream === 'stderr' ? 'text-[#FF9B54]' : 'text-[#E4E7ED]'
                  }`}
                >
                  {l.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Terminal Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.05] bg-[#0A0E14] px-4 py-1.5 font-mono text-[10px] text-[#697384]">
          <span>Lines: {filteredLogs.length} / 1000 buffer</span>
          <span>Target: {selectedContainerId ? selectedContainerId.slice(0, 12) : 'none'}</span>
        </div>
      </div>
    </div>
  )
}
