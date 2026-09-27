import { Search, X } from 'lucide-react'

export default function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697384]"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#11161F] pl-9 pr-8 text-[12px] text-[#F3F5F7] placeholder-[#697384] outline-none transition-all duration-150 focus:border-[#36D6B4]/50 focus:bg-[#151B24] focus:shadow-[0_0_12px_rgba(54,214,180,0.12)]"
      />
      {value && (
        <button
          onClick={() => onChange?.('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#697384] hover:text-[#F3F5F7] transition"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
