import { InputHTMLAttributes } from "react"

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={`w-full border border-border rounded-xl px-3 py-2.5 text- bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-border disabled:opacity-50 ${className}`}
            {...props}
        />
    )
}