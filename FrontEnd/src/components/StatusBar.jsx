export default function StatusBar() {
  const isProd = import.meta.env.PROD

  return (
    <footer className="flex h-[30px] items-center justify-between border-t border-border-primary bg-bg-secondary px-5 select-none">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent-primary animate-pulse-dot" />
        <span className="text-[11px] font-medium text-text-secondary">
          {isProd ? 'Production Gateway • Reverse Proxy Active' : 'Development Stack • Localhost'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <span>ContainerGuard Engine v2.4</span>
        <span>•</span>
        <span>Docker Engine Socket: Connected</span>
      </div>
    </footer>
  )
}
