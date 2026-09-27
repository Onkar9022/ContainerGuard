import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { ScrollText, Search } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Logs() {
  const [containers, setContainers] = useState([])
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [logs, setLogs] = useState([])
  const [logStatus, setLogStatus] = useState('idle') // idle, connecting, connected, error, disconnected
  const [logError, setLogError] = useState(null)
  const [search, setSearch] = useState('')
  const [isFollowing, setIsFollowing] = useState(true)

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
          // Select first running container by default if available
          const firstRunning = list.find((c) => c.state === 'running') || list[0]
          setSelectedContainerId(firstRunning.id)
        }
      } catch {
        setContainers([])
      }
    }
    loadContainers()
  }, [])

  // 2. Manage Socket.IO connection when selected container changes
  useEffect(() => {
    if (!selectedContainerId) return

    // Clean up previous socket if active
    if (socketRef.current) {
      socketRef.current.emit('logs:stop')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setLogs([])
    setLogError(null)
    setLogStatus('connecting')

    const backendUrl = import.meta.env.VITE_API_URL !== undefined
      ? import.meta.env.VITE_API_URL
      : (import.meta.env.PROD ? undefined : 'http://localhost:5000')

    const socket = io(backendUrl || undefined, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('logs:start', { containerId: selectedContainerId })
    })

    socket.on('logs:status', ({ status }) => setLogStatus(status))

    socket.on('logs:error', ({ message }) => {
      setLogError(message)
      setLogStatus('error')
    })

    socket.on('logs:data', (logEntry) => {
      setLogs((prev) => {
        const updated = [...prev, logEntry]
        return updated.slice(-1000) // Keep max 1000 lines
      })
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('logs:stop')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [selectedContainerId])

  // 3. Auto-scroll to bottom if following
  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isFollowing])

  const filteredLogs = logs.filter((l) =>
    !search || l.message.toLowerCase().includes(search.toLowerCase())
  )

  const clearLogs = () => setLogs([])
  const toggleFollow = () => setIsFollowing(!isFollowing)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Live Logs</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Stream real-time stdout and stderr output from containers via Socket.IO.
          </p>
        </div>
      </div>

      {/* Container Selector & Filter Controls */}
      <div className="flex items-center gap-3">
        <select
          value={selectedContainerId}
          onChange={(e) => setSelectedContainerId(e.target.value)}
          className="h-9 rounded-lg border border-border-primary bg-bg-tertiary px-3 text-[12px] text-text-primary outline-none focus:border-accent-primary/50"
        >
          {containers.length === 0 ? (
            <option value="">No containers found</option>
          ) : (
            containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names?.[0] || c.id.slice(0, 12)} ({c.state})
              </option>
            ))
          )}
        </select>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Filter logs by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border-primary bg-bg-tertiary pl-9 pr-3 text-[12px] text-text-primary placeholder-text-muted outline-none transition focus:border-accent-primary/50"
          />
        </div>

        <button
          onClick={clearLogs}
          className="h-9 rounded-lg border border-border-secondary bg-bg-surface px-3 text-[12px] font-medium text-text-secondary hover:text-text-primary transition"
        >
          Clear
        </button>

        <button
          onClick={toggleFollow}
          className={`h-9 rounded-lg border px-3 text-[12px] font-medium transition ${
            isFollowing
              ? 'border-accent-primary/50 bg-accent-primary/10 text-accent-primary'
              : 'border-border-secondary bg-bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          {isFollowing ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
        </button>
      </div>

      {/* Terminal Log Viewer */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden flex flex-col" style={{ height: '620px' }}>
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-2 text-[11px] bg-bg-tertiary">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                logStatus === 'connected'
                  ? 'bg-status-success'
                  : logStatus === 'error'
                  ? 'bg-status-error'
                  : 'bg-status-warning'
              }`}
            />
            <span className="font-mono text-text-secondary capitalize">{logStatus}</span>
            {logError && <span className="text-status-error font-mono">— {logError}</span>}
          </div>
          <span className="text-text-muted font-mono">{filteredLogs.length} lines displayed</span>
        </div>

        <div
          className="flex-1 overflow-y-auto bg-[#0a0c10] p-4 font-mono text-[11px] sm:text-[12px] leading-relaxed"
          onWheel={() => setIsFollowing(false)}
        >
          {!selectedContainerId ? (
            <EmptyState
              icon={ScrollText}
              title="No container selected"
              message="Choose a container from the dropdown to start streaming live stdout/stderr logs."
            />
          ) : filteredLogs.length === 0 ? (
            <div className="text-text-muted text-center py-16">
              {logs.length === 0 ? 'Connecting to log stream...' : 'No log lines match your keyword filter.'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded break-all">
                <span className="text-text-muted shrink-0 select-none">
                  {log.timestamp ? new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '') : ''}
                </span>
                <span
                  className={`shrink-0 select-none ${
                    log.stream === 'stderr' ? 'text-status-error' : 'text-accent-primary/70'
                  }`}
                >
                  [{log.stream || 'stdout'}]
                </span>
                <span className={log.stream === 'stderr' ? 'text-status-error/90' : 'text-gray-300'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}
