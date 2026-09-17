import { Activity as ActivityIcon, Clock } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Activity() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Activity</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Audit log of container lifecycle events, deployments, and security actions.
        </p>
      </div>

      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="grid grid-cols-[140px_80px_1fr_1fr_100px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Timestamp</span>
          <span>Type</span>
          <span>Event</span>
          <span>Resource</span>
          <span>Actor</span>
        </div>

        <EmptyState
          icon={ActivityIcon}
          title="No activity recorded"
          message="Activity events will be logged as you interact with containers, deployments, and security scanning."
        />

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing 0 events
        </div>
      </div>
    </div>
  )
}
