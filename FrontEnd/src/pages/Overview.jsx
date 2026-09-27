import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Shield, AlertTriangle } from 'lucide-react'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import api from '../services/api'

export default function Overview() {
  const [health, setHealth] = useState(null)
  const [containers, setContainers] = useState([])
  const [dockerInfo, setDockerInfo] = useState(null)
  const [policySummary, setPolicySummary] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [alertsSummary, setAlertsSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      try {
        const [
          healthRes,
          containersRes,
          infoRes,
          policyRes,
          scansRes,
          alertsRes,
        ] = await Promise.allSettled([
          api.get('/api/health'),
          api.get('/api/docker/containers'),
          api.get('/api/docker/info'),
          api.get('/api/security/policies/summary'),
          api.get('/api/security/scans?limit=5'),
          api.get('/api/alerts/summary'),
        ])

        if (isMounted) {
          if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
          if (containersRes.status === 'fulfilled') setContainers(containersRes.value?.data || [])
          if (infoRes.status === 'fulfilled') setDockerInfo(infoRes.value?.data || null)
          if (policyRes.status === 'fulfilled') setPolicySummary(policyRes.value?.data || null)
          if (scansRes.status === 'fulfilled') setRecentScans(scansRes.value?.data || [])
          if (alertsRes.status === 'fulfilled') setAlertsSummary(alertsRes.value?.data || null)
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    const timer = setInterval(loadDashboardData, 15000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  const running = containers.filter((c) => c.state === 'running').length
  const stopped = containers.filter((c) => c.state !== 'running').length
  const total = containers.length

  const latestScan = recentScans[0] || null

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
            Live overview of container workloads, security posture, vulnerabilities, and system health.
          </p>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Workloads */}
        <StatCard
          icon={Container}
          label="Containers"
          value={
            <span className="flex items-baseline gap-1">
              {total} <span className="text-sm font-normal text-text-muted">Total</span>
            </span>
          }
          subValue={
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-accent-primary">● {running} Running</span>
              <span className="text-[11px] text-text-muted">● {stopped} Stopped</span>
            </div>
          }
        />

        {/* Security Posture */}
        <div
          onClick={() => navigate('/security')}
          className="rounded-xl border border-border-primary bg-bg-surface p-4 cursor-pointer hover:border-accent-primary/30 transition"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Security Score</p>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-2xl font-bold text-text-primary">
              {policySummary?.averageScore !== undefined ? policySummary.averageScore : '—'}
            </p>
            <span className="text-sm text-text-muted">/ 100</span>
            <span className="text-[11px] font-medium text-accent-primary">
              {policySummary ? `${policySummary.evaluatedContainers} containers evaluated` : 'Pending'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-text-secondary flex gap-2">
            <span className="text-status-success">✓ {policySummary?.compliantContainers ?? 0} Compliant</span>
            <span className="text-status-error">✗ {policySummary?.nonCompliantContainers ?? 0} Violating</span>
          </div>
        </div>

        {/* Vulnerabilities */}
        <div
          onClick={() => navigate('/security')}
          className="rounded-xl border border-border-primary bg-bg-surface p-4 cursor-pointer hover:border-accent-primary/30 transition"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Vulnerabilities</p>
          {latestScan ? (
            <div>
              <div className="flex items-center gap-2 mt-2">
                <SeverityBadge severity="Crit" count={latestScan.criticalCount} />
                <SeverityBadge severity="High" count={latestScan.highCount} />
                <span className="text-[12px] text-text-muted">{latestScan.mediumCount} Med</span>
              </div>
              <p className="mt-2 text-[11px] text-text-muted truncate">
                Latest: <span className="font-mono text-text-secondary">{latestScan.image}</span>
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-xl font-bold text-text-secondary">No Scans</p>
              <p className="mt-1 text-[11px] text-text-muted">Scan an image in Security tab</p>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div
          onClick={() => navigate('/alerts')}
          className="rounded-xl border border-border-primary bg-bg-surface p-4 cursor-pointer hover:border-accent-primary/30 transition"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Alerts</p>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-2xl font-bold text-text-primary">
              {alertsSummary?.open ?? 0}
            </p>
            <span className="text-sm text-severity-critical font-medium">Open</span>
            <span className="text-[11px] text-text-muted">({alertsSummary?.total ?? 0} total)</span>
          </div>
          <div className="mt-2 text-[11px] text-text-secondary flex gap-2">
            <span className="text-severity-critical">● {alertsSummary?.critical ?? 0} Crit</span>
            <span className="text-severity-high">● {alertsSummary?.warning ?? 0} Warn</span>
            <span className="text-text-muted">● {alertsSummary?.resolved ?? 0} Resolved</span>
          </div>
        </div>
      </div>

      {/* Container fleet + Security sidebar */}
      <div className="grid grid-cols-[1fr_360px] gap-4">
        {/* Container fleet table */}
        <div className="rounded-xl border border-border-primary bg-bg-surface">
          <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[14px] font-semibold text-text-primary">Active Container Fleet</h2>
              <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] font-semibold text-accent-primary">
                {total} tracked
              </span>
            </div>
            <button
              onClick={() => navigate('/containers')}
              className="text-[11px] font-medium text-accent-primary hover:underline"
            >
              View All Containers →
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_1fr_100px] gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
            <span>Container</span>
            <span>Status</span>
            <span>Image</span>
            <span>Ports</span>
          </div>

          {/* Container rows */}
          {containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Container size={32} className="text-text-muted" strokeWidth={1.2} />
              <p className="mt-3 text-[13px] font-medium text-text-secondary">No containers detected</p>
              <p className="mt-1 text-[12px] text-text-muted">Start containers to see them here</p>
            </div>
          ) : (
            containers.slice(0, 7).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/containers/${c.id}`)}
                className="grid grid-cols-[1fr_80px_1fr_100px] gap-2 items-center px-5 py-2 border-b border-border-primary last:border-0 text-[12px] cursor-pointer hover:bg-bg-hover transition"
              >
                <div>
                  <p className="font-medium text-text-primary truncate">{c.names?.[0] || '—'}</p>
                  <p className="font-mono text-[10px] text-text-muted">{c.id.slice(0, 12)}</p>
                </div>
                <StatusBadge status={c.state} />
                <p className="text-text-secondary truncate">{c.image}</p>
                <p className="font-mono text-[10px] text-text-muted truncate">
                  {c.ports?.filter((p) => p.PublicPort).map((p) => `${p.PublicPort}→${p.PrivatePort}`).join(', ') || '—'}
                </p>
              </div>
            ))
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
            <span>Docker Engine: {dockerInfo ? 'Connected' : 'Offline'}</span>
            <span>Displaying {Math.min(containers.length, 7)} of {total} containers</span>
          </div>
        </div>

        {/* Security & Host sidebar */}
        <div className="space-y-4">
          {/* Policy Compliance Card */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
                <Shield size={14} className="text-accent-primary" />
                Security Policy Compliance
              </h3>
              <span className="text-[11px] text-text-muted">Engine CG001–CG006</span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between py-1 border-b border-border-primary">
                <span className="text-text-secondary">Average Compliance Score</span>
                <span className="font-bold text-accent-primary font-mono">
                  {policySummary?.averageScore ?? 100} / 100
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-primary">
                <span className="text-text-secondary">Compliant Containers</span>
                <span className="font-mono text-status-success">
                  {policySummary?.compliantContainers ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-primary">
                <span className="text-text-secondary">Violating Containers</span>
                <span className="font-mono text-status-error">
                  {policySummary?.nonCompliantContainers ?? 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/security')}
              className="mt-3 w-full rounded-lg border border-border-secondary bg-bg-tertiary py-2 text-[12px] font-medium text-text-secondary transition hover:border-accent-primary/30 hover:text-accent-primary"
            >
              Open Security Policy Engine →
            </button>
          </div>

          {/* Recent Security Scans */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-severity-high" />
                Recent Vulnerability Scans
              </h3>
              <span className="text-[11px] text-text-muted">Trivy</span>
            </div>
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Shield size={24} className="text-text-muted" strokeWidth={1.2} />
                <p className="mt-2 text-[12px] text-text-muted">No scan history recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.slice(0, 3).map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => navigate('/security', { state: { image: scan.image } })}
                    className="flex items-center justify-between py-1.5 border-b border-border-primary last:border-0 cursor-pointer hover:text-accent-primary transition text-[12px]"
                  >
                    <div className="truncate max-w-[190px]">
                      <p className="text-text-primary font-medium truncate">{scan.image}</p>
                      <p className="text-[10px] text-text-muted">
                        {new Date(scan.scanTimestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <SeverityBadge severity="Crit" count={scan.criticalCount} />
                      <SeverityBadge severity="High" count={scan.highCount} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
