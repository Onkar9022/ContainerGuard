import { useState, useEffect } from 'react'
import { Container, Shield, AlertTriangle, Server, RefreshCw, Clock, Scan } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import ProgressBar from '../components/ProgressBar'
import api from '../services/api'

// Placeholder chart data — will be replaced with real metrics in Phase 8-9
const emptyChartData = Array.from({ length: 15 }, (_, i) => ({
  time: `${-15 + i}m`,
  cpu: 0,
  memory: 0,
  rx: 0,
  tx: 0,
}))

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-primary bg-bg-elevated px-3 py-2 text-[11px] shadow-xl">
      <p className="mb-1 font-medium text-text-secondary">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {p.value.toFixed(1)}
        </p>
      ))}
    </div>
  )
}

export default function Overview() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get('/api/health')
        setHealth(data)
      } catch {
        setHealth(null)
      }
    }
    fetch()
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
            {health?.status === 'ok' ? (
              <span className="flex items-center gap-1.5 rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse-dot" />
                API Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-status-error/15 px-2.5 py-0.5 text-[11px] font-semibold text-status-error">
                <span className="h-1.5 w-1.5 rounded-full bg-status-error" />
                API Offline
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Monitor container health, infrastructure resources, and security posture across active nodes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:border-accent-primary/30 hover:text-text-primary">
            <Clock size={13} />
            Last 15m
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:border-accent-primary/30 hover:text-text-primary">
            <RefreshCw size={13} />
            5s Poll
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-accent-primary/15 px-3 py-1.5 text-[12px] font-semibold text-accent-primary transition hover:bg-accent-primary/25">
            <Scan size={13} />
            Quick Scan
          </button>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Container}
          label="Workloads"
          value={<span className="flex items-baseline gap-1">0 <span className="text-sm font-normal text-text-muted">Total</span></span>}
          subValue={
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-accent-primary">● 0 Run</span>
              <span className="text-[11px] text-text-muted">● 0 Stop</span>
            </div>
          }
        />
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Security Posture</p>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-2xl font-bold text-text-primary">—</p>
            <span className="text-sm text-text-muted">/ 100</span>
            <span className="text-[12px] text-text-muted">Pending scan</span>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Vulnerabilities</p>
          <div className="flex items-center gap-2 mt-2">
            <SeverityBadge severity="Crit" count={0} />
            <SeverityBadge severity="High" count={0} />
            <span className="text-[12px] text-text-muted">0 Med</span>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">Trivy: not connected</p>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Host: {health?.status === 'ok' ? 'LOCAL-DEV' : 'OFFLINE'}
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-secondary">CPU</span>
              <span className="font-mono text-text-muted">—%</span>
            </div>
            <ProgressBar value={0} max={100} size="xs" />
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-secondary">RAM</span>
              <span className="font-mono text-text-muted">—%</span>
            </div>
            <ProgressBar value={0} max={100} size="xs" />
          </div>
        </div>
      </div>

      {/* Container fleet + Security sidebar */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Container fleet table */}
        <div className="rounded-xl border border-border-primary bg-bg-surface">
          <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[14px] font-semibold text-text-primary">Active Container Fleet</h2>
              <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] font-semibold text-accent-primary">
                0 tracked
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <button className="rounded px-2 py-0.5 font-medium text-text-primary bg-bg-hover">All (0)</button>
              <button className="rounded px-2 py-0.5 font-medium text-text-muted hover:text-text-secondary">Running (0)</button>
              <button className="rounded px-2 py-0.5 font-medium text-text-muted hover:text-text-secondary">Stopped (0)</button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_1fr_70px_80px_70px_70px] gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
            <span>Container</span>
            <span>Status</span>
            <span>Image</span>
            <span>CPU %</span>
            <span>Memory</span>
            <span>Net I/O</span>
            <span>Uptime</span>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Container size={32} className="text-text-muted" strokeWidth={1.2} />
            <p className="mt-3 text-[13px] font-medium text-text-secondary">No containers detected</p>
            <p className="mt-1 text-[12px] text-text-muted">Docker Engine integration will be added in Phase 4</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
            <span>● Virtual Network Bridge: —</span>
            <span>Displaying 0 of 0 containers</span>
          </div>
        </div>

        {/* Security sidebar */}
        <div className="space-y-4">
          {/* Compliance card */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
                <Shield size={14} className="text-accent-primary" />
                Compliance & CIS
              </h3>
              <span className="text-[11px] text-text-muted">Docker CIS v1.6</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1e2233" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#2a2f42" strokeWidth="4"
                    strokeDasharray={`${0} ${2 * Math.PI * 24}`} strokeLinecap="round" />
                </svg>
                <span className="absolute text-[13px] font-bold text-text-muted">—%</span>
              </div>
              <div>
                <p className="text-[12px] text-text-secondary">0 / 0 checks passing</p>
              </div>
            </div>
            <div className="space-y-2 text-[12px] text-text-secondary">
              <p className="flex items-center gap-2">
                <span className="text-text-muted">○</span>
                No containers scanned yet
              </p>
            </div>
            <button className="mt-3 w-full rounded-lg border border-border-secondary bg-bg-tertiary py-2 text-[12px] font-medium text-text-secondary transition hover:border-accent-primary/30 hover:text-accent-primary">
              Launch Image Vulnerability Scan
            </button>
          </div>

          {/* Recent security findings */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-severity-high" />
                Recent Security Findings
              </h3>
              <span className="text-[11px] text-text-muted">Trivy</span>
            </div>
            <div className="flex flex-col items-center py-6 text-center">
              <Shield size={24} className="text-text-muted" strokeWidth={1.2} />
              <p className="mt-2 text-[12px] text-text-muted">No scan results yet</p>
              <p className="text-[11px] text-text-muted">Trivy integration in Phase 11</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resource telemetry charts */}
      <div className="rounded-xl border border-border-primary bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-text-primary">Resource Telemetry & Host Load</h2>
            <p className="text-[11px] text-text-muted mt-0.5">Aggregated metrics streamed from cgroups v2 daemon</p>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {['5m', '15m', '30m', '1h', '6h', '24h'].map((t) => (
              <button key={t} className={`rounded px-2 py-0.5 font-medium ${t === '15m' ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border-primary">
          {/* CPU chart */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">CPU Utilization</p>
            </div>
            <p className="text-xl font-bold text-text-primary font-mono">—% <span className="text-[12px] font-normal text-text-muted">avg</span></p>
            <div className="mt-3 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emptyChartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cpu" stroke="#00d4aa" fill="url(#cpuGrad)" strokeWidth={1.5} name="CPU" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory chart */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Memory Footprint</p>
            </div>
            <p className="text-xl font-bold text-text-primary font-mono">— <span className="text-[12px] font-normal text-text-muted">/ — GB</span></p>
            <div className="mt-3 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emptyChartData}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="memory" stroke="#3b82f6" fill="url(#memGrad)" strokeWidth={1.5} name="Memory" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network chart */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Network Throughput</p>
            </div>
            <p className="text-xl font-bold text-text-primary font-mono">— <span className="text-[12px] font-normal text-text-muted">MB/s RX/TX</span></p>
            <div className="mt-3 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emptyChartData}>
                  <defs>
                    <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="rx" stroke="#00d4aa" fill="url(#rxGrad)" strokeWidth={1.5} name="RX" />
                  <Area type="monotone" dataKey="tx" stroke="#8b5cf6" fill="url(#txGrad)" strokeWidth={1.5} name="TX" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-primary" />RX</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-chart-purple" />TX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
