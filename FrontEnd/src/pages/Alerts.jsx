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
} from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL, OPEN, ACKNOWLEDGED, RESOLVED
  const [severityFilter, setSeverityFilter] = useState('ALL') // ALL, CRITICAL, WARNING, NOTICE
  const [sourceFilter, setSourceFilter] = useState('ALL') // ALL, METRICS, DOCKER, SECURITY, POLICY
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
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
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
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
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
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    } finally {
      setActionLoading(null)
    }
  }

  function getSeverityBadge(severity) {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-severity-critical/15 px-2 py-0.5 text-[10px] font-bold text-severity-critical border border-severity-critical/30">
            <XCircle size={11} /> CRITICAL
          </span>
        )
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-severity-high/15 px-2 py-0.5 text-[10px] font-bold text-severity-high border border-severity-high/30">
            <AlertTriangle size={11} /> WARNING
          </span>
        )
      case 'NOTICE':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-chart-blue/15 px-2 py-0.5 text-[10px] font-bold text-chart-blue border border-chart-blue/30">
            <Bell size={11} /> NOTICE
          </span>
        )
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-danger/15 px-2.5 py-0.5 text-[10px] font-bold text-status-danger border border-status-danger/30">
            <span className="h-1.5 w-1.5 rounded-full bg-status-danger animate-pulse" />
            OPEN
          </span>
        )
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-chart-blue/15 px-2.5 py-0.5 text-[10px] font-bold text-chart-blue border border-chart-blue/30">
            <Check size={11} />
            ACKNOWLEDGED
          </span>
        )
      case 'RESOLVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-success/15 px-2.5 py-0.5 text-[10px] font-bold text-status-success border border-status-success/30">
            <CheckCircle2 size={11} />
            RESOLVED
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Continuous Operational & Security Observability
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-text-primary">Alert Center</h1>
            {summary.open > 0 && (
              <span className="rounded px-2.5 py-0.5 text-[11px] font-bold text-white bg-severity-critical">
                {summary.open} Active Open
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Deterministic alert management evaluating CPU, memory, container health, restart loops, Trivy CVEs, and security policies.
          </p>
        </div>

        <button
          onClick={() => { setLoading(true); loadAlerts(); }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-4 py-2 text-[12px] font-medium text-text-secondary transition hover:text-text-primary hover:bg-bg-hover disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Sync Alerts</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-critical">Critical</p>
          <p className="mt-2 text-2xl font-extrabold text-severity-critical">{summary.critical}</p>
          <p className="mt-1 text-[10px] text-text-muted">Active un-resolved</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-high">Warning</p>
          <p className="mt-2 text-2xl font-extrabold text-severity-high">{summary.warning}</p>
          <p className="mt-1 text-[10px] text-text-muted">Active un-resolved</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-chart-blue">Notice</p>
          <p className="mt-2 text-2xl font-extrabold text-chart-blue">{summary.notice}</p>
          <p className="mt-1 text-[10px] text-text-muted">Active un-resolved</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-status-danger">Open</p>
          <p className="mt-2 text-2xl font-extrabold text-status-danger">{summary.open}</p>
          <p className="mt-1 text-[10px] text-text-muted">Requires action</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-chart-blue">Acknowledged</p>
          <p className="mt-2 text-2xl font-extrabold text-chart-blue">{summary.acknowledged}</p>
          <p className="mt-1 text-[10px] text-text-muted">Under investigation</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-surface p-3.5 flex flex-col justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-status-success">Resolved</p>
          <p className="mt-2 text-2xl font-extrabold text-status-success">{summary.resolved}</p>
          <p className="mt-1 text-[10px] text-text-muted">Historical audit</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-semibold text-text-muted mr-1.5">Status:</span>
          {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                statusFilter === st
                  ? 'bg-accent-primary text-white font-semibold'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity & Source Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-text-muted">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-border-secondary bg-bg-primary px-2.5 py-1 text-[12px] text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="NOTICE">Notice</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-text-muted">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-border-secondary bg-bg-primary px-2.5 py-1 text-[12px] text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="ALL">All Sources</option>
              <option value="METRICS">METRICS (AL001, AL002)</option>
              <option value="DOCKER">DOCKER (AL003, AL004)</option>
              <option value="SECURITY">SECURITY (AL005)</option>
              <option value="POLICY">POLICY (AL006)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table / List */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden shadow-sm">
        <div className="border-b border-border-primary px-5 py-3 flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          <span>Active & Historical Alerts</span>
          <span>Showing {alerts.length} Records</span>
        </div>

        {alerts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <CheckCircle2 size={36} className="text-status-success mb-3" strokeWidth={1.2} />
            <p className="text-[14px] font-medium text-text-primary">No Alerts Matching Criteria</p>
            <p className="mt-1 text-[12px] text-text-muted max-w-md">
              All monitored container operational metrics, health checks, vulnerability scans, and security policies are currently within configured thresholds.
            </p>
          </div>
        )}

        <div className="divide-y divide-border-primary">
          {alerts.map((alert) => {
            const isExpanded = expandedId === alert.id
            const isProcessing = actionLoading === alert.id

            return (
              <div
                key={alert.id}
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                className="p-4 hover:bg-bg-hover/60 transition cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Column: Code, Severity, Title, Container */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button className="mt-1 text-text-muted hover:text-text-primary transition shrink-0">
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(alert.severity)}
                        <span className="font-mono font-bold text-[11px] bg-bg-primary px-2 py-0.5 rounded border border-border-secondary text-text-primary">
                          {alert.alertCode}
                        </span>
                        <span className="text-[11px] font-mono text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">
                          {alert.source}
                        </span>
                        {getStatusBadge(alert.status)}
                      </div>

                      <h3 className="text-[14px] font-bold text-text-primary leading-tight pt-1">
                        {alert.title}
                      </h3>

                      <p className="text-[12px] text-text-secondary leading-snug">
                        {alert.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Box size={12} /> {alert.containerName} ({alert.containerId.slice(0, 12)})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> First: {new Date(alert.firstSeenAt).toLocaleTimeString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> Last: {new Date(alert.lastSeenAt).toLocaleTimeString()}
                        </span>
                        {alert.resolvedAt && (
                          <span className="text-status-success font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Resolved: {new Date(alert.resolvedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    {alert.status === 'OPEN' && (
                      <button
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-chart-blue/40 bg-chart-blue/10 text-chart-blue text-[11px] font-semibold transition hover:bg-chart-blue/20 disabled:opacity-50"
                      >
                        <Check size={12} />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={(e) => handleResolve(alert.id, e)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-status-success/40 bg-status-success/10 text-status-success text-[11px] font-semibold transition hover:bg-status-success/20 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details / Metadata Drawer */}
                {isExpanded && alert.metadata && (
                  <div className="mt-3.5 pt-3 border-t border-border-secondary/60">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                      Diagnostic Metadata:
                    </p>
                    <pre className="p-3 rounded-lg bg-bg-primary border border-border-secondary text-[11px] font-mono text-text-secondary overflow-x-auto">
                      {JSON.stringify(alert.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
