export default function StatusBar() {
  const isProd = import.meta.env.PROD

  return (
    <footer className="flex h-[28px] shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#0A0E14] px-4 text-[11px] text-[#697384] select-none">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#36D6B4] shadow-[0_0_5px_#36D6B4]" />
        <span className="font-mono text-[#A7B0BE]">
          {isProd ? 'Production Gateway :8080 • Nginx Active' : 'Development Gateway • Localhost'}
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px]">
        <span>Docker Socket: Connected</span>
        <span className="text-white/10">|</span>
        <span>ContainerGuard Engine v2.4</span>
      </div>
    </footer>
  )
}
