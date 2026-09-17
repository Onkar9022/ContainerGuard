import { Search } from 'lucide-react'

export default function SearchInput({ placeholder = 'Search...', value, onChange, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-lg border border-border-primary bg-bg-tertiary pl-9 pr-3 text-[12px] text-text-primary placeholder-text-muted outline-none transition focus:border-accent-primary/50"
      />
    </div>
  )
}
