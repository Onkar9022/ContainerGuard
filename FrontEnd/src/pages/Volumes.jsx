import { HardDrive } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Volumes() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Volumes</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Docker volume inventory and storage allocation tracking.
        </p>
      </div>

      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px_100px_100px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Volume Name</span>
          <span>Driver</span>
          <span>Mount Point</span>
          <span>Size</span>
          <span>Containers</span>
        </div>

        <EmptyState
          icon={HardDrive}
          title="No volumes discovered"
          message="Docker volume information will be available after Docker Engine integration in Phase 4."
        />

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing 0 volumes
        </div>
      </div>
    </div>
  )
}
