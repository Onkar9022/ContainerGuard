import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Cpu, MemoryStick, HardDrive, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react'
import StatCard from '../components/StatCard'
import api from '../services/api'

export default function Hosts() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/docker/info')
        setInfo(res.data)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch Docker Engine info')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function formatBytes(bytes) {
    if (!bytes) return '—'
    const gb = bytes / (1024 ** 3)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 ** 2)
    return `${mb.toFixed(0)} MB`
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Hosts</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Infrastructure host metrics and Docker Engine runtime configuration.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2.5 text-[12px] text-status-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[13px] text-text-muted">
          <RefreshCw size={16} className="animate-spin mr-2" />
          Connecting to Docker Engine...
        </div>
      )}

      {info && (
        <>
          {/* Host info stat cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Server} label="OS" value={info.osType || '—'} subValue={info.os || '—'} />
            <StatCard icon={Cpu} label="CPU Cores" value={info.cpus ?? '—'} subValue={`Architecture: ${info.architecture || '—'}`} />
            <StatCard icon={MemoryStick} label="Total Memory" value={formatBytes(info.totalMemory)} subValue={`Kernel: ${info.kernelVersion || '—'}`} />
            <StatCard icon={HardDrive} label="Containers" value={info.containersTotal ?? 0} subValue={`${info.containersRunning ?? 0} running · ${info.containersStopped ?? 0} stopped`} />
          </div>

          {/* Docker Engine info */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-text-primary">Docker Engine Runtime</h2>
              <span className="flex items-center gap-1.5 text-[11px] text-accent-primary">
                <span className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
                Connected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Docker Version', value: info.dockerVersion },
                { label: 'API Version', value: info.apiVersion },
                { label: 'Storage Driver', value: info.storageDriver },
                { label: 'Runtimes', value: info.runtimes?.join(', ') || '—' },
                { label: 'OS Type', value: info.osType },
                { label: 'Architecture', value: info.architecture },
                { label: 'Total Containers', value: info.containersTotal },
                { label: 'Total Images', value: info.imagesTotal },
                { label: 'Running Containers', value: info.containersRunning },
                { label: 'Stopped Containers', value: info.containersStopped },
                { label: 'Paused Containers', value: info.containersPaused },
                { label: 'Kernel Version', value: info.kernelVersion },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border-primary py-2">
                  <span className="text-[12px] text-text-secondary">{item.label}</span>
                  <span className="font-mono text-[12px] text-text-primary">{item.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real Metrics Link Card */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent-primary/10 text-accent-primary">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-text-primary">Container Resource Telemetry</h3>
                <p className="text-[12px] text-text-muted">
                  View real-time CPU, RAM, and network throughput charts persisted across running containers.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/metrics')}
              className="rounded-lg bg-accent-primary/15 px-4 py-2 text-[12px] font-semibold text-accent-primary hover:bg-accent-primary/25 transition"
            >
              Open Metrics Dashboard →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
