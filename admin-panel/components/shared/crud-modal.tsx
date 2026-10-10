"use client"
import { ReactNode } from "react"

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  onSave: () => void
  saveLabel?: string
}

export function CrudModal({ open, onClose, title, description, children, onSave, saveLabel = "Salvar" }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-[14px] text-foreground">{title}</h2>
        {description && <p className="text-[12px] text-muted-foreground mt-1">{description}</p>}
        <div className="mt-4 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-full text-[13px] text-foreground hover:bg-muted transition">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-[13px] font-medium hover:opacity-90 transition">{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}