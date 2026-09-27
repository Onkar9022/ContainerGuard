import { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Box,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Check,
  Activity,
  Zap,
} from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    notice: 0,
    bySource: { METRICS: 0, DOCKER: 0, SECURITY: 0, POLICY: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState(null)

  // Fetch summary and alert records
  async function loadAlerts() {
    try {
      const queryParams = new URLSearchParams()
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter)
      if (severityFilter !== 'ALL') queryParams.append('severity', severityFilter)
      if (sourceFilter !== 'ALL') queryParams.append('source', sourceFilter)
      queryParams.append('limit', '100')

      const [alertsRes, summaryRes] = await Promise.allSettled([
        api.get(`/api/alerts?${queryParams.toString()}`),
        api.get('/api/alerts/summary'),
      ])

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.data) {
        setAlerts(Array.isArray(alertsRes.value.data) ? alertsRes.value.data : [])
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setSummary(summaryRes.value.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const timer = setInterval(loadAlerts, 10000)
    return () => clearInterval(timer)
  }, [statusFilter, severityFilter, sourceFilter])

  // Acknowledge alert
  async function handleAcknowledge(id, e) {
    e.stopPropagation()
    setActionLoading(id)
    try {
      await api.patch(`/api/alerts/${id}/acknowledge`)
      await loadAlerts()
    } finally {
      setActionLoading(null)
    }
  }

  // Resolve alert
  async function handleResolve(id, e) {
    e.stopPropagation()
    setActionLoading(id)
    try {
      await api.patch(`/api/alerts/${id}/resolve`, { reason: 'Manually resolved via Alert Center' })
      await loadAlerts()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Alert Operations Center</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#FF5C70]">
              {summary.open} Open
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Automated anomaly detection, cgroup threshold violations, and security policy incident response.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Sync Alerts
        </button>
      </div>

      {/* KPI Severity & Lifecycle Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-[#FF5C70]/20 bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">CRITICAL</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#FF5C70]">{summary.critical}</div>
        </div>

        <div className="rounded-xl border border-[#FF9B54]/20 bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">WARNING</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#FF9B54]">{summary.warning}</div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">NOTICE</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#A7B0BE]">{summary.notice}</div>
        </div>

        <div className="rounded-xl border border-[#36D6B4]/20 bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">OPEN</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#36D6B4]">{summary.open}</div>
        </div>

        <div className="rounded-xl border border-[#F2C94C]/20 bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">ACKNOWLEDGED</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#F2C94C]">{summary.acknowledged}</div>
        </div>

        <div className="rounded-xl border border-[#35D399]/20 bg-[#11161F] p-3">
          <span className="font-mono text-[10px] text-[#697384] uppercase">RESOLVED</span>
          <div className="mt-1 text-2xl font-bold font-mono text-[#35D399]">{summary.resolved}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#697384]">STATUS:</span>
          {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                statusFilter === st
                  ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                  : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline text-white/10">|</span>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#697384]">SEVERITY:</span>
          {['ALL', 'CRITICAL', 'WARNING'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                severityFilter === sev
                  ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                  : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline text-white/10">|</span>

        {/* Source Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#697384]">SOURCE:</span>
          {['ALL', 'METRICS', 'DOCKER', 'SECURITY', 'POLICY'].map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                sourceFilter === src
                  ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                  : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed Timeline */}
      <div className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-white/[0.07] bg-[#11161F]">
            <EmptyState
              icon={Bell}
              title="No alerts match current filters"
              message="All monitored container systems are operating within safe cgroup and security thresholds."
            />
          </div>
        ) : (
          alerts.map((alert) => {
            const isExpanded = expandedId === alert.id
            const isResolved = alert.status === 'RESOLVED'
            const isAck = alert.status === 'ACKNOWLEDGED'

            return (
              <div
                key={alert.id}
                className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden transition-all hover:border-white/[0.12]"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3 hover:bg-[#151B24] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div>
                      <SeverityBadge severity={alert.severity} size="sm" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-[#36D6B4]">
                          [{alert.alertCode}]
                        </span>
                        <h3 className="font-semibold text-[#F3F5F7] text-[13px] truncate">
                          {alert.title}
                        </h3>
                        <span className="rounded bg-white/5 px-1.5 py-0.2 font-mono text-[9px] text-[#697384]">
                          {alert.source}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#A7B0BE] truncate">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Meta */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="font-mono text-[11px] text-[#697384]">
                      {new Date(alert.lastSeenAt || alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isResolved && !isAck && (
                        <button
                          onClick={(e) => handleAcknowledge(alert.id, e)}
                          disabled={actionLoading === alert.id}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-[#A7B0BE] hover:text-[#F3F5F7] transition"
                        >
                          Ack
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          onClick={(e) => handleResolve(alert.id, e)}
                          disabled={actionLoading === alert.id}
                          className="rounded-md border border-[#35D399]/30 bg-[#35D399]/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#35D399] hover:bg-[#35D399]/20 transition"
                        >
                          Resolve
                        </button>
                      )}

                      {isResolved && (
                        <span className="rounded-md bg-[#35D399]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#35D399]">
                          RESOLVED
                        </span>
                      )}
                    </div>

                    <div className="text-[#697384]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expandable Diagnostic Evidence */}
                {isExpanded && (
                  <div className="border-t border-white/[0.05] bg-[#0D1118] p-4 text-[12px] font-mono space-y-2 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#697384]">
                      <div>Container Target: <span className="text-[#F3F5F7]">{alert.containerName}</span> ({alert.containerId?.slice(0, 12)})</div>
                      <div>First Detected: <span className="text-[#A7B0BE]">{new Date(alert.firstSeenAt).toLocaleString()}</span></div>
                      <div>Last Triggered: <span className="text-[#A7B0BE]">{new Date(alert.lastSeenAt).toLocaleString()}</span></div>
                      {alert.resolvedAt && (
                        <div>Resolved At: <span className="text-[#35D399]">{new Date(alert.resolvedAt).toLocaleString()}</span></div>
                      )}
                    </div>

                    {alert.metadata && (
                      <div className="mt-2">
                        <span className="text-[#697384] text-[10px] uppercase block mb-1">Diagnostic Telemetry Payload:</span>
                        <pre className="rounded bg-black/40 p-2.5 text-[11px] text-[#36D6B4] overflow-x-auto border border-white/5">
                          {JSON.stringify(alert.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
