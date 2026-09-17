import { Shield, Download, Scan, RefreshCw } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'

export default function Security() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Auditing Cluster Infrastructure
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-text-primary">Security Center</h1>
            <span className="rounded bg-severity-critical px-2 py-0.5 text-[11px] font-bold text-white">
              0 Critical CVEs
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Analyze Docker images and real-time runtime container security posture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Engine: Trivy —</span>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <Download size={13} />
            Export Audit
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <RefreshCw size={13} />
            Rescan All Images
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-accent-primary/50 bg-accent-primary/10 px-3 py-1.5 text-[12px] font-semibold text-accent-primary transition hover:bg-accent-primary/20">
            <Scan size={13} />
            Scan Custom Registry
          </button>
        </div>
      </div>

      {/* Score cards row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Overall posture */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Overall</p>
            <span className="rounded bg-bg-hover px-2 py-0.5 text-[11px] font-semibold text-text-secondary">Grade —</span>
          </div>
          <p className="text-[11px] text-text-muted">Posture</p>
          <p className="text-5xl font-bold text-text-primary mt-1">—</p>
          <p className="text-sm text-text-muted">/ 100</p>
        </div>

        {/* Severity matrix */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Severity Matrix</p>
            <span className="text-[11px] text-text-muted">0 Active CVEs</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'CRIT', count: 0, color: 'text-severity-critical' },
              { label: 'HIGH', count: 0, color: 'text-severity-high' },
              { label: 'MED', count: 0, color: 'text-severity-medium' },
              { label: 'LOW', count: 0, color: 'text-severity-low' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] font-semibold text-text-muted uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CIS benchmark */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">CIS Benchmark</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-text-primary">—</span>
            <span className="text-text-muted">/</span>
            <span className="text-xl text-text-muted">—</span>
          </div>
          <div className="mt-2 space-y-1 text-[12px] text-text-secondary">
            <p>Docker Daemon Config: <span className="text-text-muted">—</span></p>
            <p>Rootless Container: <span className="text-text-muted">—</span></p>
          </div>
        </div>

        {/* Supply chain */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">Supply Chain</p>
          <p className="text-xl font-bold text-text-muted">Pending</p>
          <p className="text-[12px] text-text-muted mt-2">Image verification not configured</p>
        </div>
      </div>

      {/* Vulnerability chart placeholder */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">
          Vulnerability Overview by Severity & Component
        </h3>
        <p className="text-[12px] text-text-muted mb-4">
          Risk proportion distribution clustered across common runtime shared libraries.
        </p>
        <div className="flex items-center justify-center py-12 text-[13px] text-text-muted">
          <Shield size={24} className="mr-2" strokeWidth={1.2} />
          No vulnerability data — Trivy integration in Phase 11
        </div>
      </div>

      {/* Vulnerability table */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-3 border-b border-border-primary px-5 py-3">
          {[
            { label: 'All', count: 0 },
            { label: 'Critical', count: 0, dot: 'bg-severity-critical' },
            { label: 'High', count: 0 },
            { label: 'Medium', count: 0 },
            { label: 'Fixable Only', count: 0 },
          ].map((tab, i) => (
            <button
              key={tab.label}
              className={`flex items-center gap-1.5 text-[12px] font-medium ${
                i === 0 ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.dot && <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />}
              {tab.label}
              <span className="text-text-muted">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_1fr_90px_90px_1fr_70px_70px] gap-2 items-center px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Severity</span>
          <span>CVE Identifier</span>
          <span>Vulnerable Package</span>
          <span>Installed</span>
          <span>Fixed In</span>
          <span>Affected Image & Container</span>
          <span>Score</span>
          <span>Actions</span>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield size={32} className="text-text-muted" strokeWidth={1.2} />
          <p className="mt-3 text-[13px] font-medium text-text-secondary">No vulnerabilities detected</p>
          <p className="mt-1 text-[12px] text-text-muted">Trivy scanner will be integrated in Phase 11</p>
        </div>

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing 0 of 0 detected vulnerabilities
        </div>
      </div>
    </div>
  )
}
