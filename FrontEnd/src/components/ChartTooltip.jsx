export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-white/10 bg-[#151B24] p-2.5 shadow-xl backdrop-blur-md">
      {label && (
        <div className="border-b border-white/5 pb-1 mb-1.5 font-mono text-[11px] text-[#697384]">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || '#36D6B4' }}
              />
              <span className="text-[#A7B0BE]">{item.name || 'Value'}</span>
            </div>
            <span className="font-mono font-semibold text-[#F3F5F7]">
              {item.value} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
