"use client"
import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

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
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text- text-foreground">{title}</h2>
        {description && <p className="text- text-muted-foreground mt-1">{description}</p>}
        <div className="mt-4 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-full text- text-foreground hover:bg-muted transition bg-background/60">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text- font-medium hover:opacity-90 transition">{saveLabel}</button>
        </div>
      </Card>
    </div>
  )
}