import { useState, useEffect } from 'react'
import { Server, Cpu, MemoryStick, HardDrive, RefreshCw, AlertCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import ProgressBar from '../components/ProgressBar'
import api from '../services/api'

export default function Hosts() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // Format bytes to human-readable
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
          Infrastructure host metrics and Docker Engine runtime information.
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
              <h2 className="text-[14px] font-semibold text-text-primary">Docker Engine</h2>
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

          {/* Resource usage — placeholder bars, real CPU/mem metrics come in Phase 8 */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h2 className="text-[14px] font-semibold text-text-primary mb-4">Resource Utilization</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[12px]">
                  <span className="text-text-secondary">CPU Cores Available</span>
                  <span className="font-mono text-text-primary">{info.cpus ?? '—'} cores</span>
                </div>
                <ProgressBar value={0} max={100} size="md" />
                <p className="text-[10px] text-text-muted mt-1">Per-container CPU metrics available in Phase 8</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[12px]">
                  <span className="text-text-secondary">Memory Capacity</span>
                  <span className="font-mono text-text-primary">{formatBytes(info.totalMemory)}</span>
                </div>
                <ProgressBar value={0} max={100} size="md" color="bg-chart-blue" />
                <p className="text-[10px] text-text-muted mt-1">Per-container memory metrics available in Phase 8</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[12px]">
                  <span className="text-text-secondary">Disk Usage</span>
                  <span className="font-mono text-text-muted">— / — GB</span>
                </div>
                <ProgressBar value={0} max={100} size="md" color="bg-chart-purple" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
