import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[#697384]">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-[14px] font-semibold text-[#F3F5F7] tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-[12px] text-[#A7B0BE] leading-relaxed">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
