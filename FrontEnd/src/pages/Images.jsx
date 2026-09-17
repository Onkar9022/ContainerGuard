import { Box, Scan } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function Images() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Images</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Docker image inventory, vulnerability status, and supply chain metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-accent-primary/50 bg-accent-primary/10 px-3 py-1.5 text-[12px] font-semibold text-accent-primary transition hover:bg-accent-primary/20">
            <Scan size={13} />
            Scan All Images
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_120px_80px_100px_100px_100px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Repository</span>
          <span>Tag</span>
          <span>Image ID</span>
          <span>Size</span>
          <span>Created</span>
          <span>Containers</span>
          <span>Security</span>
        </div>

        <EmptyState
          icon={Box}
          title="No images found"
          message="Docker image inventory will be available after Docker Engine integration in Phase 4. Trivy scanning in Phase 11."
        />

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing 0 images
        </div>
      </div>
    </div>
  )
}
