"use client"
import { useState } from "react"
import { Input } from "@/components/ui/button"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2, "Min 2 chars"),
  description: z.string().min(5),
})

export function RoleForm({ initial, onSubmit }: { initial?: any, onSubmit: (v: any) => void }) {
  const [name, setName] = useState(initial?.name || "")
  const [desc, setDesc] = useState(initial?.description || "")
  const [err, setErr] = useState("")

  return (
    <div className="space-y-3">
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do cargo (ex: Financeiro)" className="w-full border border-border rounded-xl px-3 py-2.5 text- bg-card" />
      <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descrição" className="w-full border border-border rounded-xl px-3 py-2.5 text- h-20 bg-card" />
      {err && <p className="text- text-red-500">{err}</p>}
      <button onClick={()=>{
        const r = schema.safeParse({ name, description: desc })
        if(!r.success){ setErr(r.error.issues[0].message); return }
        onSubmit({ name, description: desc })
      }} className="hidden" id="role-form-submit" />
    </div>
  )
}