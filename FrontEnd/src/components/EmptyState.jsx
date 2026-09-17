import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl bg-bg-surface p-4 text-text-muted">
        <Icon size={40} strokeWidth={1.2} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-text-secondary">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
