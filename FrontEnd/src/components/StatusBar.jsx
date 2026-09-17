import { Cpu, MemoryStick } from 'lucide-react'

export default function StatusBar() {
  return (
    <footer className="flex h-[30px] items-center justify-between border-t border-border-primary bg-bg-secondary px-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent-primary animate-pulse-dot" />
        <span className="text-[11px] font-medium text-text-secondary">
          Development • Local • localhost
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <Cpu size={11} />
          CPU —%
        </span>
        <span className="flex items-center gap-1">
          <MemoryStick size={11} />
          RAM —%
        </span>
      </div>
    </footer>
  )
}
