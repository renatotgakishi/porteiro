"use client"
import { Search } from "lucide-react"

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5 bg-card">
      <Search size={14} className="text-muted-foreground shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
      />
    </div>
  )
}