import { Activity as ActivityIcon } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Activity() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Activity Audit Log</h1>
        <p className="mt-1 text-[13px] text-[#A7B0BE]">
          Audit log of container lifecycle events, deployments, and security actions.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        <div className="grid grid-cols-[140px_80px_1fr_1fr_100px] gap-3 items-center px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
          <span>Timestamp</span>
          <span>Type</span>
          <span>Event</span>
          <span>Resource</span>
          <span>Actor</span>
        </div>

        <div className="py-16 text-center">
          <EmptyState
            icon={ActivityIcon}
            title="No activity recorded"
            message="Activity events will be logged as you interact with containers, deployments, and security scanning."
          />
        </div>
      </div>
    </div>
  )
}
