import { HTMLAttributes } from "react"

export function Card({ className = "",...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl shadow-sm ${className}`}
      {...props}
    />
  )
}