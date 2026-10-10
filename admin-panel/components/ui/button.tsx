// button.tsx
import { ButtonHTMLAttributes } from "react"

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded-full text-[13px] font-medium transition bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 ${className}`}

      {...props}
    />
  )
}

export function GhostButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded-full text-[13px] font-medium border border-border bg-card hover:bg-muted text-foreground transition ${className}`}

      {...props}
    />
  )
}


// input.tsx
import { InputHTMLAttributes } from "react"

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border border-border rounded-xl px-3 py-2.5 text- bg-card outline-none focus:ring-2 focus:ring-[hsl(var(--border))] ${className}`}
      {...props}
    />
  )
}
  