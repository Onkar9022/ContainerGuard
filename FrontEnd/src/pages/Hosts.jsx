import { useState, useEffect } from 'react'
import {
  Server,
  Cpu,
  Database,
  Container,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Layers,
  Terminal,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import api from '../services/api'

export default function Hosts() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHostInfo = async () => {
    try {
      const res = await api.get('/api/docker/info')
      setInfo(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch Docker Engine host info')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHostInfo()
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Host Infrastructure</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              EC2 &bull; Docker Engine
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Hardware topology, virtualization layer, and Docker daemon daemon runtime specifications.
          </p>
        </div>

        <button
          onClick={fetchHostInfo}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FF5C70]/30 bg-[#FF5C70]/10 px-4 py-3 text-[12px] text-[#FF5C70]">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {loading && !info ? (
        <div className="flex h-64 items-center justify-center font-mono text-[13px] text-[#697384]">
          <RefreshCw size={16} className="animate-spin mr-2 text-[#36D6B4]" />
          Inspecting host hardware and Docker socket...
        </div>
      ) : info && (
        <>
          {/* Top Hardware KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Server}
              label="HOST OS"
              value={info.osType || 'Linux'}
              subValue={<span className="truncate block font-mono text-[11px] text-[#A7B0BE]">{info.os || '—'}</span>}
              badge="KERNEL 6.x"
              badgeType="neutral"
            />

            <StatCard
              icon={Cpu}
              label="CPU ALLOCATION"
              value={`${info.cpus ?? 2} Cores`}
              subValue={<span className="font-mono text-[11px] text-[#A7B0BE]">Arch: {info.architecture || 'x86_64'}</span>}
              badge="SMP"
              badgeType="teal"
            />

            <StatCard
              icon={Database}
              label="TOTAL RAM"
              value={formatBytes(info.totalMemory)}
              subValue={<span className="font-mono text-[11px] text-[#A7B0BE]">Kernel: {info.kernelVersion?.slice(0, 18) || '—'}</span>}
              badge="PHYSICAL"
              badgeType="neutral"
            />

            <StatCard
              icon={Container}
              label="FLEET UNITS"
              value={info.containersTotal ?? 0}
              subValue={
                <span className="font-mono text-[11px] text-[#36D6B4]">
                  {info.containersRunning ?? 0} running &bull; {info.containersStopped ?? 0} stopped
                </span>
              }
              badge={`${info.imagesTotal ?? 0} IMAGES`}
              badgeType="teal"
            />
          </div>

          {/* Docker Engine Runtime 2-Column Key/Value Specification Matrix */}
          <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-[#36D6B4]" />
                <h2 className="text-[14px] font-semibold text-[#F3F5F7]">Docker Engine Runtime Specification</h2>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#36D6B4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#36D6B4] shadow-[0_0_6px_#36D6B4]" />
                Socket Connected
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 font-mono text-[12px]">
              {[
                { label: 'Docker Engine Version', value: info.dockerVersion },
                { label: 'Docker API Version', value: info.apiVersion },
                { label: 'Storage Driver', value: info.storageDriver },
                { label: 'Configured Runtimes', value: info.runtimes?.join(', ') || 'runc' },
                { label: 'Operating System', value: info.os },
                { label: 'System Architecture', value: info.architecture },
                { label: 'Kernel Version', value: info.kernelVersion },
                { label: 'Daemon Server Time', value: info.serverTime },
                { label: 'Total Tracked Containers', value: info.containersTotal },
                { label: 'Running Workloads', value: info.containersRunning },
                { label: 'Stopped Workloads', value: info.containersStopped },
                { label: 'Paused Workloads', value: info.containersPaused },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-white/[0.04] py-2"
                >
                  <span className="text-[#697384]">{item.label}</span>
                  <span className="font-semibold text-[#F3F5F7] text-right truncate max-w-xs">{item.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
