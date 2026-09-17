import { Rocket, GitBranch, CheckCircle, XCircle, Clock, RefreshCw, Download, ScrollText, Webhook } from 'lucide-react'
import StatCard from '../components/StatCard'

export default function Deployments() {
  const pipelineSteps = [
    { label: 'GitHub', detail: '—', status: 'pending', icon: GitBranch },
    { label: 'Auto Tests', detail: '—', status: 'pending', icon: CheckCircle },
    { label: 'Docker Build', detail: '—', status: 'pending', icon: Rocket },
    { label: 'Trivy Gate', detail: '—', status: 'pending', icon: CheckCircle },
    { label: 'ECR Push', detail: '—', status: 'pending', icon: Download },
    { label: 'SSM Agent', detail: '—', status: 'pending', icon: RefreshCw },
    { label: 'Healthcheck', detail: '—', status: 'pending', icon: CheckCircle },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Deployments</h1>
            <span className="rounded bg-chart-blue/15 px-2 py-0.5 text-[11px] font-semibold text-chart-blue uppercase">
              Live CI/CD Engine
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Monitor Docker build automation, vulnerability gates, and AWS EC2 runtime releases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text-primary">
            <Webhook size={13} />
            Pipeline Webhooks
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-accent-primary/50 bg-accent-primary/10 px-3 py-1.5 text-[12px] font-semibold text-accent-primary transition hover:bg-accent-primary/20">
            <Rocket size={13} />
            Trigger Manual Build
          </button>
        </div>
      </div>

      {/* Deploy stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Success Rate (30D)" value="—%" subValue="0 total builds dispatched" />
        <StatCard icon={Clock} label="Mean Build Duration" value="—" subValue="Docker BuildKit registry layer cache" />
        <StatCard icon={XCircle} label="Security Gate Blockers" value="0" subValue="No Trivy gates configured" />
        <StatCard icon={Rocket} label="Active Target Fleet" value="—" subValue="EC2 not configured" />
      </div>

      {/* Pipeline visualization */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-semibold text-text-primary">Active Deployment Pipeline Architecture</h2>
            <p className="text-[12px] text-text-muted mt-0.5">
              Release: — • Target: — • Container: —
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-text-muted" />
            <span className="text-[11px] text-text-muted">Pipeline: Not configured</span>
          </div>
        </div>

        {/* Pipeline steps */}
        <div className="flex items-center justify-between">
          {pipelineSteps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-secondary bg-bg-elevated">
                  <step.icon size={20} className="text-text-muted" />
                </div>
                <p className="mt-2 text-[11px] font-medium text-text-secondary">{step.label}</p>
                <p className="text-[10px] text-text-muted">{step.detail}</p>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className="mx-2 h-px w-12 bg-border-secondary" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Deployment history + execution spec */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* History table */}
        <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 border-b border-border-primary px-5 py-3">
            <select className="h-8 rounded-lg border border-border-primary bg-bg-tertiary px-2 text-[12px] text-text-primary outline-none">
              <option>Branch: all</option>
              <option>main</option>
              <option>staging</option>
            </select>
            <select className="h-8 rounded-lg border border-border-primary bg-bg-tertiary px-2 text-[12px] text-text-primary outline-none">
              <option>Environment: All</option>
              <option>Production</option>
              <option>Staging</option>
            </select>
            <select className="h-8 rounded-lg border border-border-primary bg-bg-tertiary px-2 text-[12px] text-text-primary outline-none">
              <option>Status: All</option>
              <option>Success</option>
              <option>Failed</option>
            </select>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_120px_90px_100px] gap-2 items-center px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
            <span>Commit & Message</span>
            <span>Branch</span>
            <span>Target Image</span>
            <span>Status</span>
            <span>Pipeline</span>
          </div>

          {/* Empty */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Rocket size={32} className="text-text-muted" strokeWidth={1.2} />
            <p className="mt-3 text-[13px] font-medium text-text-secondary">No deployments recorded</p>
            <p className="mt-1 text-[12px] text-text-muted">CI/CD pipeline will be configured in Phase 21-23</p>
          </div>
        </div>

        {/* Execution spec panel */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-text-primary">Execution Spec</h3>
            <span className="font-mono text-[11px] text-text-muted">—</span>
          </div>

          <div className="flex items-center gap-4 mb-4 py-3 border-b border-border-primary">
            {[
              { icon: RefreshCw, label: 'Re-deploy' },
              { icon: Download, label: 'Manifest' },
              { icon: ScrollText, label: 'Logs' },
            ].map((action) => (
              <button key={action.label} className="flex flex-col items-center gap-1 text-text-muted hover:text-text-secondary transition">
                <action.icon size={16} />
                <span className="text-[10px]">{action.label}</span>
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
            Pipeline Execution Steps
          </p>
          <div className="space-y-3">
            {['Checkout Repository', 'Cache Restore', 'Unit & Security Linting', 'Docker BuildKit Compilation', 'Trivy Security Evaluation', 'Amazon ECR Push', 'AWS SSM Run Command', 'Container Health Check Probe'].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-border-secondary bg-bg-elevated flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                </span>
                <span className="text-[12px] text-text-secondary">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
