export default function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  badge,
  badgeType = 'neutral',
  onClick,
}) {
  const badgeStyles = {
    neutral: 'bg-white/5 text-[#A7B0BE] border-white/5',
    teal: 'bg-[#36D6B4]/10 text-[#36D6B4] border-[#36D6B4]/20',
    critical: 'bg-[#FF5C70]/10 text-[#FF5C70] border-[#FF5C70]/20',
    warning: 'bg-[#FF9B54]/10 text-[#FF9B54] border-[#FF9B54]/20',
  }

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border border-white/[0.07] bg-[#11161F] p-4 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-white/[0.14] hover:bg-[#151B24]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#697384]">
          {label}
        </span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-[#A7B0BE] group-hover:text-[#F3F5F7] group-hover:border-white/10 transition">
            <Icon size={14} />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-[#F3F5F7]">
          {value}
        </div>
        {badge && (
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none ${
              badgeStyles[badgeType] || badgeStyles.neutral
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subValue && (
        <div className="mt-2 text-[12px] text-[#A7B0BE] leading-relaxed">
          {subValue}
        </div>
      )}
    </div>
  )
}
