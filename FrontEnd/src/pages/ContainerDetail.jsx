import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, RefreshCw, AlertCircle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import api from '../services/api'

export default function ContainerDetail() {
  const { id } = useParams()
  const [container, setContainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  
  // Logs state
  const [logs, setLogs] = useState([])
  const [logStatus, setLogStatus] = useState('disconnected')
  const [logError, setLogError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(true)
  const socketRef = useRef(null)
  const logsEndRef = useRef(null)
  const logsContainerRef = useRef(null)

  const tabs = ['Overview', 'Live Logs', 'Environment', 'Mounts', 'Networks']

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/docker/containers/${id}`)
        setContainer(res.data)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to inspect container')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  // Socket.IO Logs Management
  useEffect(() => {
    if (activeTab === 'Live Logs' && !socketRef.current) {
      // Connect to the backend (via reverse-proxied gateway in prod or direct in dev)
      const backendUrl = import.meta.env.VITE_API_URL !== undefined
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.PROD ? undefined : 'http://localhost:5000')
      const socket = io(backendUrl || undefined, { transports: ['websocket', 'polling'] })
      socketRef.current = socket

      socket.on('connect', () => {
        socket.emit('logs:start', { containerId: id })
      })

      socket.on('logs:status', ({ status }) => setLogStatus(status))
      
      socket.on('logs:error', ({ message }) => {
        setLogError(message)
        setLogStatus('error')
      })

      socket.on('logs:data', (logEntry) => {
        setLogs(prev => {
          const updated = [...prev, logEntry]
          return updated.slice(-1000) // Keep max 1000 lines
        })
      })
    }

    return () => {
      if (activeTab !== 'Live Logs' && socketRef.current) {
        // Disconnect when switching away from Live Logs tab
        socketRef.current.emit('logs:stop')
        socketRef.current.disconnect()
        socketRef.current = null
        setLogStatus('disconnected')
      }
    }
  }, [activeTab, id])

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('logs:stop')
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Auto-scrolling
  useEffect(() => {
    if (isFollowing && logsEndRef.current && activeTab === 'Live Logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isFollowing, activeTab])

  const toggleFollow = () => setIsFollowing(!isFollowing)
  const clearLogs = () => setLogs([])

  function formatDate(dateStr) {
    if (!dateStr || dateStr === '0001-01-01T00:00:00Z') return '—'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px] text-text-muted">
        <RefreshCw size={16} className="animate-spin mr-2" />
        Loading container details...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[12px]">
          <Link to="/containers" className="flex items-center gap-1 text-text-secondary hover:text-accent-primary transition">
            <ArrowLeft size={14} /> Containers
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text-primary font-medium font-mono">{id?.slice(0, 12)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2.5 text-[12px] text-status-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  const c = container

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]">
        <Link to="/containers" className="flex items-center gap-1 text-text-secondary hover:text-accent-primary transition">
          <ArrowLeft size={14} />
          Containers
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium font-mono">{c.name || id?.slice(0, 12)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary">{c.name || 'Container Details'}</h1>
            <StatusBadge status={c.state?.status} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[12px] text-text-secondary">{c.id?.slice(0, 12)}</span>
            <button
              className="text-text-muted hover:text-text-primary transition"
              onClick={() => navigator.clipboard.writeText(c.id)}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-primary">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[12px] font-medium transition border-b-2 ${
              activeTab === tab
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-2 gap-4">
          {/* General info */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">General</h3>
            <div className="space-y-2">
              {[
                { label: 'Name', value: c.name },
                { label: 'Image', value: c.image },
                { label: 'Created', value: formatDate(c.created) },
                { label: 'Status', value: c.state?.status },
                { label: 'PID', value: c.state?.pid || '—' },
                { label: 'Exit Code', value: c.state?.exitCode ?? '—' },
                { label: 'Started', value: formatDate(c.state?.startedAt) },
                { label: 'Finished', value: formatDate(c.state?.finishedAt) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border-primary py-1.5 last:border-0">
                  <span className="text-[12px] text-text-secondary">{row.label}</span>
                  <span className="font-mono text-[12px] text-text-primary truncate max-w-[260px]">{row.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Config */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">Configuration</h3>
            <div className="space-y-2">
              {[
                { label: 'Hostname', value: c.config?.hostname },
                { label: 'Working Dir', value: c.config?.workingDir || '/' },
                { label: 'Entrypoint', value: c.config?.entrypoint?.join(' ') || '—' },
                { label: 'Command', value: c.config?.cmd?.join(' ') || '—' },
                { label: 'Exposed Ports', value: c.config?.exposedPorts?.join(', ') || '—' },
                { label: 'Restart Policy', value: c.hostConfig?.restartPolicy?.Name || '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border-primary py-1.5 last:border-0">
                  <span className="text-[12px] text-text-secondary">{row.label}</span>
                  <span className="font-mono text-[12px] text-text-primary truncate max-w-[260px]">{row.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Live Logs' && (
        <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden flex flex-col" style={{ height: '600px' }}>
          {/* Logs Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-primary bg-bg-surface">
            <div className="flex items-center gap-4 text-[12px]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  logStatus === 'connected' ? 'bg-status-success' : 
                  logStatus === 'error' ? 'bg-status-error' : 'bg-status-warning'
                }`}></span>
                <span className="text-text-secondary capitalize">{logStatus}</span>
              </div>
              {logError && <span className="text-status-error">{logError}</span>}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={clearLogs}
                className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary border border-border-primary rounded-lg transition"
              >
                Clear
              </button>
              <button 
                onClick={toggleFollow}
                className={`px-3 py-1.5 text-[12px] border rounded-lg transition ${
                  isFollowing 
                    ? 'text-accent-primary border-accent-primary/50 bg-accent-primary/10' 
                    : 'text-text-secondary border-border-primary hover:text-text-primary'
                }`}
              >
                {isFollowing ? 'Following' : 'Paused'}
              </button>
            </div>
          </div>

          {/* Logs Terminal Window */}
          <div 
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto bg-[#0A0A0A] p-4 font-mono text-[11px] sm:text-[12px] leading-relaxed"
            onWheel={() => setIsFollowing(false)} // Pause auto-scroll on manual scroll
          >
            {logs.length === 0 ? (
              <div className="text-text-muted text-center py-10">Waiting for logs...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded break-all">
                  <span className="text-text-muted shrink-0 select-none">
                    {new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '')}
                  </span>
                  <span className={`shrink-0 select-none ${log.stream === 'stderr' ? 'text-status-error' : 'text-accent-primary/70'}`}>
                    [{log.stream}]
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
      )}

      {activeTab === 'Environment' && (
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <h3 className="text-[13px] font-semibold text-text-primary mb-3">Environment Variables</h3>
          {c.config?.env?.length > 0 ? (
            <div className="space-y-1">
              {c.config.env.map((envVar, i) => {
                const [key, ...rest] = envVar.split('=')
                return (
                  <div key={i} className="flex gap-2 py-1.5 border-b border-border-primary last:border-0 text-[12px] font-mono">
                    <span className="text-accent-primary font-semibold shrink-0">{key}</span>
                    <span className="text-text-muted">=</span>
                    <span className="text-text-secondary truncate">{rest.join('=')}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[12px] text-text-muted">No environment variables set.</p>
          )}
        </div>
      )}

      {activeTab === 'Mounts' && (
        <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_1fr_80px_60px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
            <span>Type</span>
            <span>Source</span>
            <span>Destination</span>
            <span>Mode</span>
            <span>RW</span>
          </div>
          {c.mounts?.length > 0 ? c.mounts.map((m, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr_1fr_80px_60px] gap-3 items-center px-5 py-2.5 text-[12px] border-b border-border-primary last:border-0">
              <span className="capitalize text-text-secondary">{m.type}</span>
              <span className="font-mono text-text-muted truncate">{m.source}</span>
              <span className="font-mono text-text-secondary truncate">{m.destination}</span>
              <span className="text-text-muted">{m.mode || '—'}</span>
              <span className={m.rw ? 'text-accent-primary' : 'text-status-error'}>{m.rw ? 'Yes' : 'No'}</span>
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-[12px] text-text-muted">No mounts configured.</div>
          )}
        </div>
      )}

      {activeTab === 'Networks' && (
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <h3 className="text-[13px] font-semibold text-text-primary mb-3">Connected Networks</h3>
          {c.network?.networks && Object.keys(c.network.networks).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(c.network.networks).map(([name, net]) => (
                <div key={name} className="rounded-lg border border-border-primary p-3">
                  <p className="text-[13px] font-medium text-text-primary mb-2">{name}</p>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    {[
                      { label: 'Network ID', value: net.NetworkID?.slice(0, 12) },
                      { label: 'IP Address', value: net.IPAddress },
                      { label: 'Gateway', value: net.Gateway },
                      { label: 'MAC Address', value: net.MacAddress },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between">
                        <span className="text-text-secondary">{row.label}</span>
                        <span className="font-mono text-text-primary">{row.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-text-muted">Not connected to any networks.</p>
          )}
        </div>
      )}
    </div>
  )
}
